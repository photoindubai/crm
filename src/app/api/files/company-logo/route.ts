import { NextResponse } from "next/server";
import {
  badRequest,
  buildEntityStoragePath,
  forbidden,
  getLogoValidationOptions,
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
    const companyId = String(formData.get("companyId") ?? "").trim();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!companyId) {
      return badRequest("Missing companyId.");
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
      .select("id,organization_id")
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
    const { fileId, storagePath } = buildEntityStoragePath({
      entityType: "company",
      fileCategory: "logos",
      fileName: file.name,
      companyId: company.id,
    });

    const inserted = await uploadAndInsertFileMetadata({
      fileId,
      file,
      storagePath,
      metadata: {
        organization_id: organizationId,
        company_id: company.id,
        entity_type: "company",
        entity_id: company.id,
        file_category: "logo",
        file_role: "primary",
        status: "approved",
        uploaded_by: auth.userId,
      },
    });

    const { error: updateError } = await supabase.from("companies").update({ primary_logo_file_id: inserted.id }).eq("id", company.id);
    if (updateError) {
      return serverError("Uploaded file, but failed to set companies.primary_logo_file_id.");
    }

    return NextResponse.json(toUploadResponse(inserted));
  } catch (error) {
    console.error("[api/files/company-logo] unexpected:", error);
    return serverError("Failed to upload company logo.");
  }
}
