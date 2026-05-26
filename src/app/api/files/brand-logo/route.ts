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
import { invalidateBrandLogo } from "@/lib/cache/invalidate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireRouteAuth();
    if (auth instanceof NextResponse) {
      return auth;
    }

    const formData = await request.formData();
    const logoRoles = getLogoRolesFromFormData(formData);
    const brandId = String(formData.get("brandId") ?? "").trim();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!brandId) {
      return badRequest("Missing brandId.");
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
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id,organization_id,primary_logo_file_id")
      .eq("id", brandId)
      .maybeSingle();

    if (brandError) {
      return serverError("Failed to load brand.");
    }
    if (!brand) {
      return notFound("Brand not found.");
    }
    if (brand.organization_id && brand.organization_id !== auth.organizationId) {
      return forbidden("Brand is outside your organization.");
    }

    const organizationId = brand.organization_id ?? auth.organizationId;
    const fullBuffer = Buffer.from(await file.arrayBuffer());
    const { fileId, storagePath } = buildEntityStoragePath({
      entityType: "brand",
      fileCategory: "logos",
      fileName: file.name,
      brandId: brand.id,
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
        brand_id: brand.id,
        entity_type: "brand",
        entity_id: brand.id,
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
        entityType: "brand",
        fileCategory: "logos",
        fileName: thumb.filename,
        brandId: brand.id,
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
          brand_id: brand.id,
          entity_type: "brand",
          entity_id: brand.id,
          file_category: getLogoFileCategory(),
          file_role: logoRoles.thumbRole,
          status: "approved",
          uploaded_by: auth.userId,
        },
      });
      thumbInsertedId = thumbInserted.id;
      thumbInsertedPublicUrl = thumbInserted.public_url;
    }

    const shouldSetPrimary = logoRoles.fullRole === "full" || !brand.primary_logo_file_id;
    const nextPrimaryId = thumbInsertedId ?? fullInserted.id;
    const nextPrimaryUrl = thumbInsertedPublicUrl ?? fullInserted.public_url;
    const updatePayload: { primary_logo_file_id?: string; brand_logo_url?: string | null } = {};
    if (shouldSetPrimary) {
      updatePayload.primary_logo_file_id = nextPrimaryId;
      updatePayload.brand_logo_url = nextPrimaryUrl;
    }

    const { error: updateError } = shouldSetPrimary
      ? await supabase.from("brands").update(updatePayload).eq("id", brand.id)
      : { error: null };
    if (updateError) {
      return serverError("Uploaded file, but failed to set brands.primary_logo_file_id.");
    }

    invalidateBrandLogo(organizationId, brand.id);

    return NextResponse.json(toUploadResponse(fullInserted));
  } catch (error) {
    console.error("[api/files/brand-logo] unexpected:", error);
    return serverError("Failed to upload brand logo.");
  }
}
