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
    const brandId = String(formData.get("brandId") ?? "").trim();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!brandId) {
      return badRequest("Missing brandId.");
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
      .select("id,organization_id")
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
    const { fileId, storagePath } = buildEntityStoragePath({
      entityType: "brand",
      fileCategory: "logos",
      fileName: file.name,
      brandId: brand.id,
    });

    const inserted = await uploadAndInsertFileMetadata({
      fileId,
      file,
      storagePath,
      metadata: {
        organization_id: organizationId,
        brand_id: brand.id,
        entity_type: "brand",
        entity_id: brand.id,
        file_category: "logo",
        file_role: "primary",
        status: "approved",
        uploaded_by: auth.userId,
      },
    });

    const { error: updateError } = await supabase.from("brands").update({ primary_logo_file_id: inserted.id }).eq("id", brand.id);
    if (updateError) {
      return serverError("Uploaded file, but failed to set brands.primary_logo_file_id.");
    }

    return NextResponse.json(toUploadResponse(inserted));
  } catch (error) {
    console.error("[api/files/brand-logo] unexpected:", error);
    return serverError("Failed to upload brand logo.");
  }
}
