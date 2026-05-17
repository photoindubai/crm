import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildR2PublicUrl, buildStoragePath, deleteFromR2, getR2BucketName, uploadToR2 } from "@/lib/r2/server";

const LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MATERIAL_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip"]);

export const LOGO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const MATERIAL_MAX_SIZE_BYTES = 25 * 1024 * 1024;

export type RouteAuth = {
  userId: string;
  organizationId: string;
};

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function requireRouteAuth(): Promise<RouteAuth | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,status,organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = profile.organization_id ?? process.env.DEFAULT_ORGANIZATION_ID ?? null;
  if (!organizationId) {
    return serverError("DEFAULT_ORGANIZATION_ID is required.");
  }

  return {
    userId: user.id,
    organizationId,
  };
}

export function validateFile(file: File | null, options: { allowedMimeTypes: Set<string>; maxBytes: number }) {
  if (!file) {
    return { ok: false as const, response: badRequest("Missing file.") };
  }

  if (!options.allowedMimeTypes.has(file.type)) {
    return { ok: false as const, response: badRequest(`Invalid file type: ${file.type || "unknown"}.`) };
  }

  if (file.size > options.maxBytes) {
    return { ok: false as const, response: badRequest(`File is too large. Max size is ${Math.floor(options.maxBytes / 1024 / 1024)} MB.`) };
  }

  return { ok: true as const };
}

export function getLogoValidationOptions() {
  return { allowedMimeTypes: LOGO_MIME_TYPES, maxBytes: LOGO_MAX_SIZE_BYTES };
}

export function getMaterialValidationOptions() {
  return { allowedMimeTypes: MATERIAL_MIME_TYPES, maxBytes: MATERIAL_MAX_SIZE_BYTES };
}

export async function uploadAndInsertFileMetadata(params: {
  fileId: string;
  file: File;
  storagePath: string;
  metadata: {
    organization_id: string;
    event_id?: string | null;
    company_id?: string | null;
    participation_id?: string | null;
    brand_id?: string | null;
    entity_type: "company" | "brand" | "participation";
    entity_id: string;
    file_category: string;
    file_role: string;
    status: "approved" | "uploaded";
    uploaded_by: string;
  };
}) {
  const supabase = createSupabaseAdminClient();
  const bucket = getR2BucketName("public");
  const publicUrl = buildR2PublicUrl(params.storagePath);
  const fileId = params.fileId;
  const fileBytes = Buffer.from(await params.file.arrayBuffer());
  const originalFilename = params.file.name || "file";

  await uploadToR2({
    bucket,
    storagePath: params.storagePath,
    body: fileBytes,
    contentType: params.file.type,
    cacheControl: "public, max-age=31536000",
  });

  const payload = {
    id: fileId,
    organization_id: params.metadata.organization_id,
    event_id: params.metadata.event_id ?? null,
    company_id: params.metadata.company_id ?? null,
    participation_id: params.metadata.participation_id ?? null,
    brand_id: params.metadata.brand_id ?? null,
    entity_type: params.metadata.entity_type,
    entity_id: params.metadata.entity_id,
    file_category: params.metadata.file_category,
    file_role: params.metadata.file_role,
    provider: "cloudflare_r2",
    bucket,
    storage_path: params.storagePath,
    external_url: null,
    public_url: publicUrl,
    original_filename: originalFilename,
    mime_type: params.file.type,
    size_bytes: params.file.size,
    is_public: true,
    source: "r2_upload",
    status: params.metadata.status,
    uploaded_by: params.metadata.uploaded_by,
  } as const;

  const { data: inserted, error } = await supabase.from("files").insert(payload).select("*").single();

  if (error || !inserted) {
    try {
      await deleteFromR2({ bucket, storagePath: params.storagePath });
    } catch (cleanupError) {
      console.error("[files-upload] cleanup failed:", cleanupError);
    }
    throw new Error(error?.message ?? "Failed to create files metadata.");
  }

  return inserted;
}

export function toUploadResponse(file: {
  id: string;
  provider: string;
  bucket: string;
  storage_path: string | null;
  public_url: string | null;
  file_category: string;
  status: string;
}) {
  return {
    id: file.id,
    provider: file.provider,
    bucket: file.bucket,
    storage_path: file.storage_path,
    public_url: file.public_url,
    file_category: file.file_category,
    status: file.status,
  };
}

export function getOrganizationSlug() {
  return process.env.DEFAULT_ORGANIZATION_SLUG ?? "default-org";
}

export function buildEntityStoragePath(params: {
  entityType: "company" | "brand" | "participation";
  fileCategory:
    | "logos"
    | "brochures"
    | "materials"
    | "product-photos"
    | "smm"
    | "other"
    | "company_profile";
  fileName: string;
  companyId?: string | null;
  brandId?: string | null;
  eventId?: string | null;
  participationId?: string | null;
}) {
  const fileId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    organizationSlug: getOrganizationSlug(),
    entityType: params.entityType,
    fileCategory: params.fileCategory,
    fileId,
    filename: params.fileName,
    companyId: params.companyId ?? null,
    brandId: params.brandId ?? null,
    eventId: params.eventId ?? null,
    participationId: params.participationId ?? null,
  });

  return { fileId, storagePath };
}
