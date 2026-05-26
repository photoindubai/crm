import { NextResponse } from "next/server";
import {
  badRequest,
  buildEntityStoragePath,
  forbidden,
  getMaterialValidationOptions,
  notFound,
  requireRouteAuth,
  serverError,
  toUploadResponse,
  uploadAndInsertFileMetadata,
  validateFile,
} from "@/app/api/files/_shared";
import { invalidateParticipationMaterial } from "@/lib/cache/invalidate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ALLOWED_CATEGORIES = new Set([
  "brochure",
  "company_profile",
  "product_photo",
  "social_media_material",
  "press_release",
  "other",
]);

export async function POST(request: Request) {
  try {
    const auth = await requireRouteAuth();
    if (auth instanceof NextResponse) {
      return auth;
    }

    const formData = await request.formData();
    const participationId = String(formData.get("participationId") ?? "").trim();
    const categoryRaw = String(formData.get("category") ?? "").trim();
    const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : null;
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    if (!participationId) {
      return badRequest("Missing participationId.");
    }
    if (!category) {
      return badRequest("Invalid category.");
    }
    if (!file) {
      return badRequest("Missing file.");
    }

    const fileValidation = validateFile(file, getMaterialValidationOptions());
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
    const storageCategory = toStorageCategory(category);
    const { fileId, storagePath } = buildEntityStoragePath({
      entityType: "participation",
      fileCategory: storageCategory,
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
        file_category: category,
        file_role: "public_material",
        status: "uploaded",
        uploaded_by: auth.userId,
      },
    });

    const { data: existingMaterial } = await supabase
      .from("exhibitor_materials")
      .select("id")
      .eq("participation_id", participation.id)
      .eq("url", inserted.public_url ?? "")
      .maybeSingle();

    if (!existingMaterial) {
      const { error: materialError } = await supabase.from("exhibitor_materials").insert({
        participation_id: participation.id,
        material_type: category,
        title: file.name,
        url: inserted.public_url,
        status: "uploaded",
      });

      if (materialError) {
        return serverError("Uploaded file, but failed to create exhibitor_materials row.");
      }
    }

    invalidateParticipationMaterial(organizationId, participation.event_id, participation.id, participation.company_id);

    return NextResponse.json(toUploadResponse(inserted));
  } catch (error) {
    console.error("[api/files/participation-material] unexpected:", error);
    return serverError("Failed to upload participation material.");
  }
}

function toStorageCategory(category: string) {
  switch (category) {
    case "brochure":
      return "brochures" as const;
    case "product_photo":
      return "product-photos" as const;
    case "social_media_material":
      return "smm" as const;
    case "company_profile":
      return "company_profile" as const;
    case "press_release":
      return "materials" as const;
    default:
      return "other" as const;
  }
}
