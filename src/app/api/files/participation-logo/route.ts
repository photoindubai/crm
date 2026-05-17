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
    const participationId = String(formData.get("participationId") ?? "").trim();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!participationId) {
      return badRequest("Missing participationId.");
    }
    if (!file) {
      return badRequest("Missing file.");
    }

    const fileValidation = validateFile(file, getLogoValidationOptions());
    if (!fileValidation.ok) {
      return fileValidation.response;
    }

    const supabase = createSupabaseAdminClient();
    const { data: participation, error: participationError } = await supabase
      .from("participations")
      .select("id,organization_id,event_id,company_id")
      .eq("id", participationId)
      .maybeSingle();

    if (participationError) {
      return serverError("Failed to load participation.");
    }
    if (!participation) {
      return notFound("Participation not found.");
    }
    if (!participation.event_id) {
      return badRequest("Participation has no event_id.");
    }
    if (participation.organization_id && participation.organization_id !== auth.organizationId) {
      return forbidden("Participation is outside your organization.");
    }

    const organizationId = participation.organization_id ?? auth.organizationId;
    const { fileId, storagePath } = buildEntityStoragePath({
      entityType: "participation",
      fileCategory: "logos",
      fileName: file.name,
      eventId: participation.event_id,
      participationId: participation.id,
    });

    const inserted = await uploadAndInsertFileMetadata({
      fileId,
      file,
      storagePath,
      metadata: {
        organization_id: organizationId,
        event_id: participation.event_id,
        company_id: participation.company_id,
        participation_id: participation.id,
        entity_type: "participation",
        entity_id: participation.id,
        file_category: "logo",
        file_role: "public",
        status: "approved",
        uploaded_by: auth.userId,
      },
    });

    const { error: updateError } = await supabase
      .from("participations")
      .update({ public_logo_file_id: inserted.id })
      .eq("id", participation.id);
    if (updateError) {
      return serverError("Uploaded file, but failed to set participations.public_logo_file_id.");
    }

    return NextResponse.json(toUploadResponse(inserted));
  } catch (error) {
    console.error("[api/files/participation-logo] unexpected:", error);
    return serverError("Failed to upload participation logo.");
  }
}
