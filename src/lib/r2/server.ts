import "server-only";

import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_PUBLIC_BUCKET = "exhibition-public-assets";
const DEFAULT_PRIVATE_BUCKET = "exhibition-private-files";

type R2Bucket = "public" | "private";

type UploadToR2Params = {
  bucket: string;
  storagePath: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  cacheControl?: string;
};

type DeleteFromR2Params = {
  bucket: string;
  storagePath: string;
};

type BuildStoragePathParams = {
  organizationSlug: string;
  entityType: "company" | "brand" | "event" | "participation";
  fileCategory:
    | "logo"
    | "brochure"
    | "company_profile"
    | "product_photo"
    | "social_media_material"
    | "press_release"
    | "other"
    | "logos"
    | "materials"
    | "smm"
    | "brochures"
    | "product-photos"
    | "floorplans"
    | "public-documents"
    | "banners"
    | "private"
    | "private-documents"
    | "contracts"
    | "invoices"
    | "payment-proofs"
    | "technical-documents"
    | "stand-design";
  fileId: string;
  filename: string;
  fileRole?: string | null;
  companyId?: string | null;
  brandId?: string | null;
  eventId?: string | null;
  participationId?: string | null;
};

type FileRecordLike = {
  provider?: string | null;
  bucket?: string | null;
  storage_path?: string | null;
  external_url?: string | null;
  public_url?: string | null;
  is_public?: boolean | null;
};

let clientSingleton: S3Client | null = null;
let clientEndpoint = "";

export function getR2Client() {
  const endpoint = resolvePrimaryEndpoint();

  if (clientSingleton && clientEndpoint === endpoint) {
    return clientSingleton;
  }

  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  clientSingleton = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
  clientEndpoint = endpoint;

  return clientSingleton;
}

export async function uploadToR2(params: UploadToR2Params) {
  const endpoint = resolvePrimaryEndpoint();
  const client = getR2Client();

  if (process.env.NODE_ENV !== "production") {
    console.info("[r2-upload] start", {
      endpoint,
      bucket: params.bucket,
      storage_path: params.storagePath,
      content_type: params.contentType ?? null,
    });
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.storagePath,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: params.cacheControl,
      }),
    );

    if (process.env.NODE_ENV !== "production") {
      console.info("[r2-upload] success", {
        endpoint,
        bucket: params.bucket,
        storage_path: params.storagePath,
      });
    }
    return;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[r2-upload] failed", {
        endpoint,
        bucket: params.bucket,
        storage_path: params.storagePath,
        code: getErrorCode(error),
        message: getErrorMessage(error),
      });
    }
    throw error;
  }
}

export async function deleteFromR2(params: DeleteFromR2Params) {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.storagePath,
    }),
  );
}

export function buildR2PublicUrl(storagePath: string) {
  const baseUrl = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  const normalizedPath = storagePath.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}

export function getR2ObjectUrl(file: FileRecordLike) {
  if (file.public_url) {
    return file.public_url;
  }

  if (file.provider === "external") {
    return file.external_url ?? null;
  }

  if (file.is_public && file.storage_path) {
    return buildR2PublicUrl(file.storage_path);
  }

  return file.external_url ?? null;
}

export function sanitizeFilename(filename: string) {
  const trimmed = filename.trim().toLowerCase();
  const [namePart, ...extParts] = trimmed.split(".");
  const extension = extParts.length > 0 ? `.${extParts.join(".")}` : "";
  const safeName = namePart
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return `${safeName || "file"}${extension}`;
}

export function buildStoragePath(params: BuildStoragePathParams) {
  const safeFilename = sanitizeFilename(params.filename);
  const leaf = `${params.fileId}-${safeFilename}`;
  const scopedCategory =
    (params.entityType === "company" || params.entityType === "brand") &&
    params.fileCategory === "logos" &&
    params.fileRole
      ? `logos/${params.fileRole}`
      : params.fileCategory;

  switch (params.entityType) {
    case "company": {
      if (!params.companyId) {
        throw new Error("companyId is required for company file path");
      }
      return `organizations/${params.organizationSlug}/companies/${params.companyId}/${scopedCategory}/${leaf}`;
    }
    case "brand": {
      if (!params.brandId) {
        throw new Error("brandId is required for brand file path");
      }
      return `organizations/${params.organizationSlug}/brands/${params.brandId}/${scopedCategory}/${leaf}`;
    }
    case "event": {
      if (!params.eventId) {
        throw new Error("eventId is required for event file path");
      }
      return `organizations/${params.organizationSlug}/events/${params.eventId}/${scopedCategory}/${leaf}`;
    }
    case "participation": {
      if (!params.eventId || !params.participationId) {
        throw new Error("eventId and participationId are required for participation file path");
      }
      return `organizations/${params.organizationSlug}/events/${params.eventId}/participations/${params.participationId}/${scopedCategory}/${leaf}`;
    }
    default:
      throw new Error(`Unsupported entity type: ${String(params.entityType)}`);
  }
}

export function getR2BucketName(bucket: R2Bucket) {
  if (bucket === "private") {
    return process.env.R2_PRIVATE_BUCKET ?? DEFAULT_PRIVATE_BUCKET;
  }

  return process.env.R2_PUBLIC_BUCKET ?? DEFAULT_PUBLIC_BUCKET;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return String(value).trim().replace(/^['"]|['"]$/g, "");
}

function resolvePrimaryEndpoint() {
  const endpoint = requireEnv("R2_ENDPOINT");
  validateR2Endpoint(endpoint);
  return endpoint;
}

function validateR2Endpoint(endpoint: string) {
  const lower = endpoint.toLowerCase();
  const publicBucket = (process.env.R2_PUBLIC_BUCKET ?? DEFAULT_PUBLIC_BUCKET).toLowerCase();
  const privateBucket = (process.env.R2_PRIVATE_BUCKET ?? DEFAULT_PRIVATE_BUCKET).toLowerCase();

  const isInvalid =
    !lower.startsWith("https://") ||
    !lower.includes(".r2.cloudflarestorage.com") ||
    lower.includes("assets.") ||
    lower.includes(publicBucket) ||
    lower.includes(privateBucket);

  if (isInvalid) {
    throw new Error("Invalid R2_ENDPOINT. Use the S3 API endpoint, not the public asset domain.");
  }
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }
  return (error as { code?: string }).code ?? null;
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return String(error);
  }
  return (error as { message?: string }).message ?? "unknown";
}
