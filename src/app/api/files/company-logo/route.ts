import { NextResponse } from "next/server";
import {
  badRequest,
  buildEntityStoragePath,
  forbidden,
  generateLogoThumbnail,
  getLogoFileCategory,
  getLogoValidationOptions,
  getLogoRolesFromFormData,
  notFound,
  requireRouteAuth,
  serverError,
  toUploadResponse,
  uploadAndInsertFileMetadata,
  validateFile,
} from "@/app/api/files/_shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireRouteAuth();
    if (auth instanceof NextResponse) {
      return auth;
    }

    const formData = await request.formData();
    const logoRoles = getLogoRolesFromFormData(formData);
    const companyId = String(formData.get("companyId") ?? "").trim();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!companyId) {
      return badRequest("Missing companyId.");
    }
    if (!logoRoles) {
      return badRequest("Invalid logoRole.");
    }
    if (!file) {
      return badRequest("Missing file.");
    }

    const fileValidation = validateFile(file, getLogoValidationOptions());
    if (!fileValidation.ok) {
      return fileValidation.response;
    }

    const supabase = createSupabaseAdminClient();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id,organization_id,primary_logo_file_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      return serverError("Failed to load company.");
    }
    if (!company) {
      return notFound("Company not found.");
    }
    if (company.organization_id && company.organization_id !== auth.organizationId) {
      return forbidden("Company is outside your organization.");
    }

    const organizationId = company.organization_id ?? auth.organizationId;
    const fullBuffer = Buffer.from(await file.arrayBuffer());
    const { fileId, storagePath } = buildEntityStoragePath({
      entityType: "company",
      fileCategory: "logos",
      fileName: file.name,
      companyId: company.id,
      fileRole: logoRoles.fullRole,
    });

    const fullInserted = await uploadAndInsertFileMetadata({
      fileId,
      file: null,
      fileBuffer: fullBuffer,
      fileMimeType: file.type,
      fileSizeBytes: fullBuffer.byteLength,
      originalFilename: file.name,
      storagePath,
      metadata: {
        organization_id: organizationId,
        company_id: company.id,
        entity_type: "company",
        entity_id: company.id,
        file_category: getLogoFileCategory(),
        file_role: logoRoles.fullRole,
        status: "approved",
        uploaded_by: auth.userId,
      },
    });

    const thumb = await generateLogoThumbnail({
      sourceBuffer: fullBuffer,
      sourceMimeType: file.type,
      sourceFilename: file.name,
    });

    let thumbInsertedId: string | null = null;
    let thumbInsertedPublicUrl: string | null = null;
    if (thumb) {
      const { fileId: thumbId, storagePath: thumbPath } = buildEntityStoragePath({
        entityType: "company",
        fileCategory: "logos",
        fileName: thumb.filename,
        companyId: company.id,
        fileRole: logoRoles.thumbRole,
      });
      const thumbInserted = await uploadAndInsertFileMetadata({
        fileId: thumbId,
        file: null,
        fileBuffer: thumb.buffer,
        fileMimeType: thumb.mimeType,
        fileSizeBytes: thumb.sizeBytes,
        originalFilename: thumb.filename,
        storagePath: thumbPath,
        metadata: {
          organization_id: organizationId,
          company_id: company.id,
          entity_type: "company",
          entity_id: company.id,
          file_category: getLogoFileCategory(),
          file_role: logoRoles.thumbRole,
          status: "approved",
          uploaded_by: auth.userId,
        },
      });
      thumbInsertedId = thumbInserted.id;
      thumbInsertedPublicUrl = thumbInserted.public_url;
    }

    const shouldSetPrimary = logoRoles.fullRole === "full" || !company.primary_logo_file_id;
    const nextPrimaryId = thumbInsertedId ?? fullInserted.id;
    const nextPrimaryUrl = thumbInsertedPublicUrl ?? fullInserted.public_url;
    const { error: updateError } = shouldSetPrimary
      ? await supabase
          .from("companies")
          .update({ primary_logo_file_id: nextPrimaryId, company_logo_url: nextPrimaryUrl })
          .eq("id", company.id)
      : { error: null };
    if (updateError) {
      return serverError("Uploaded file, but failed to set companies.primary_logo_file_id.");
    }

    return NextResponse.json(toUploadResponse(fullInserted));
  } catch (error) {
    console.error("[api/files/company-logo] unexpected:", error);
    return serverError("Failed to upload company logo.");
  }
}
