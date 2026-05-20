#!/usr/bin/env node
/**
 * Phase 5C: Copy legacy company/brand logos from external URLs to Cloudflare R2.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import ws from "ws";

const ROOT = process.cwd();
loadEnvFile(path.join(ROOT, ".env"), { override: false });
loadEnvFile(path.join(ROOT, ".env.local"), { override: true });

const LOGO_FILE_CATEGORY = "logo";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const options = parseCliArgs(process.argv.slice(2));
const env = readEnv();
const supabase = createClient(env.url, env.serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const r2Client = createR2Client();
const report = {
  startedAt: new Date().toISOString(),
  mode: options.dryRun ? "dry-run" : "apply",
  options: {
    entity: options.entity,
    limit: options.limit,
    concurrency: options.concurrency,
    skipExisting: options.skipExisting,
  },
  items: [],
  summary: {
    candidatesFound: 0,
    copiedFull: 0,
    copiedThumbs: 0,
    skippedExisting: 0,
    skippedAlreadyMigrated: 0,
    skippedUnsupported: 0,
    skippedInvalidUrl: 0,
    failedDownload: 0,
    failedUpload: 0,
    failedDbInsert: 0,
    archivedExternalRows: 0,
    updatedPrimaryPointers: 0,
    repairedPartial: 0,
    cleanedPartial: 0,
    incompleteExisting: 0,
    errorsCount: 0,
  },
};

main()
  .then(async () => {
    printSummary();
    await writeReport();
    if (report.summary.errorsCount > 0) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("[copy:legacy-logos-to-r2] fatal:", error.message);
    process.exit(1);
  });

async function main() {
  if (!options.dryRun && !options.yes) {
    console.error(
      "Refusing to run destructive/apply mode without --yes. Use --dry-run first.",
    );
    process.exit(1);
  }

  if (!options.dryRun) {
    console.warn(
      "[copy:legacy-logos-to-r2] WARNING: apply mode will upload to R2, insert files rows, update primary pointers, and archive legacy external rows.",
    );
  }

  await ensureDefaultOrganizationExists();

  const candidates = await loadCandidates();
  report.summary.candidatesFound = candidates.length;

  console.log(
    `[copy:legacy-logos-to-r2] mode=${options.dryRun ? "dry-run" : "apply"} entity=${options.entity} candidates=${candidates.length}`,
  );

  await runWithConcurrency(candidates, options.concurrency, processCandidate);
}

function parseCliArgs(argv) {
  const parsed = {
    dryRun: false,
    yes: false,
    entity: "all",
    limit: null,
    concurrency: 2,
    skipExisting: true,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--yes") {
      parsed.yes = true;
    } else if (arg.startsWith("--entity=")) {
      const value = arg.slice("--entity=".length);
      if (!["companies", "brands", "all"].includes(value)) {
        throw new Error(`Invalid --entity value: ${value}`);
      }
      parsed.entity = value;
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
      parsed.limit = value;
    } else if (arg.startsWith("--concurrency=")) {
      const value = Number(arg.slice("--concurrency=".length));
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --concurrency value: ${arg}`);
      }
      parsed.concurrency = value;
    } else if (arg.startsWith("--skip-existing=")) {
      const value = arg.slice("--skip-existing=".length);
      if (value !== "true" && value !== "false") {
        throw new Error(`Invalid --skip-existing value: ${value}`);
      }
      parsed.skipExisting = value === "true";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function readEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const defaultOrganizationId = process.env.DEFAULT_ORGANIZATION_ID;
  const defaultOrganizationSlug = process.env.DEFAULT_ORGANIZATION_SLUG;
  const r2Endpoint = process.env.R2_ENDPOINT;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2PublicBucket = process.env.R2_PUBLIC_BUCKET;
  const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  const missing = [];
  if (!url) missing.push("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!defaultOrganizationId) missing.push("DEFAULT_ORGANIZATION_ID");
  if (!defaultOrganizationSlug) missing.push("DEFAULT_ORGANIZATION_SLUG");
  if (!r2Endpoint) missing.push("R2_ENDPOINT");
  if (!r2AccessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!r2SecretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!r2PublicBucket) missing.push("R2_PUBLIC_BUCKET");
  if (!r2PublicBaseUrl) missing.push("R2_PUBLIC_BASE_URL");

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }
  if (!isUuid(defaultOrganizationId)) {
    throw new Error("DEFAULT_ORGANIZATION_ID must be a UUID.");
  }

  return {
    url,
    serviceRoleKey,
    defaultOrganizationId,
    defaultOrganizationSlug,
    r2Endpoint,
    r2AccessKeyId,
    r2SecretAccessKey,
    r2PublicBucket,
    r2PublicBaseUrl,
  };
}

async function ensureDefaultOrganizationExists() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", env.defaultOrganizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify DEFAULT_ORGANIZATION_ID: ${error.message}`);
  }
  if (!data) {
    throw new Error(`DEFAULT_ORGANIZATION_ID not found: ${env.defaultOrganizationId}`);
  }
}

async function loadCandidates() {
  const rows = [];

  if (options.entity === "companies" || options.entity === "all") {
    const companyFiles = await fetchLegacyFiles({
      entityType: "company",
      source: "legacy_company_logo_url",
      idColumn: "company_id",
    });
    const companyNames = await loadCompanyNames(companyFiles.map((row) => row.company_id).filter(Boolean));
    for (const row of companyFiles) {
      rows.push({
        entityType: "company",
        entityId: row.company_id,
        entityName: companyNames.get(row.company_id) ?? null,
        legacyFile: row,
      });
    }
  }

  if (options.entity === "brands" || options.entity === "all") {
    const brandFiles = await fetchLegacyFiles({
      entityType: "brand",
      source: "legacy_brand_logo_url",
      idColumn: "brand_id",
    });
    const brandNames = await loadBrandNames(brandFiles.map((row) => row.brand_id).filter(Boolean));
    for (const row of brandFiles) {
      rows.push({
        entityType: "brand",
        entityId: row.brand_id,
        entityName: brandNames.get(row.brand_id) ?? null,
        legacyFile: row,
      });
    }
  }

  const limited = options.limit ? rows.slice(0, options.limit) : rows;
  return limited;
}

async function fetchLegacyFiles({ entityType, source, idColumn }) {
  const allRows = await fetchAllRows("files", (query) =>
    query
      .select(
        `id,organization_id,${idColumn},entity_type,entity_id,file_category,source,external_url,status`,
      )
      .eq("provider", "external")
      .eq("entity_type", entityType)
      .eq("file_category", LOGO_FILE_CATEGORY)
      .eq("source", source)
      .not("external_url", "is", null)
      .not(idColumn, "is", null)
      .neq("status", "archived"),
  );

  return allRows.filter((row) => normalizeUrl(row.external_url));
}

async function loadCompanyNames(companyIds) {
  const unique = [...new Set(companyIds)];
  const map = new Map();
  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await supabase.from("companies").select("id,company_name").in("id", unique);
  if (error) {
    throw new Error(`Failed to load company names: ${error.message}`);
  }
  for (const row of data ?? []) {
    map.set(row.id, row.company_name);
  }
  return map;
}

async function loadBrandNames(brandIds) {
  const unique = [...new Set(brandIds)];
  const map = new Map();
  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await supabase.from("brands").select("id,brand_name").in("id", unique);
  if (error) {
    throw new Error(`Failed to load brand names: ${error.message}`);
  }
  for (const row of data ?? []) {
    map.set(row.id, row.brand_name);
  }
  return map;
}

function createRunArtifacts() {
  return {
    r2Paths: [],
    fileIds: [],
  };
}

function trackR2Upload(artifacts, storagePath) {
  artifacts.r2Paths.push(storagePath);
}

function trackFileInsert(artifacts, fileId) {
  artifacts.fileIds.push(fileId);
}

async function processCandidate(candidate) {
  const itemReport = {
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    entityName: candidate.entityName,
    legacyFileId: candidate.legacyFile.id,
    externalUrl: candidate.legacyFile.external_url,
    action: null,
    error: null,
  };

  try {
    const migrationState = await assessEntityMigrationState(candidate);
    itemReport.migrationState = migrationState.kind;

    if (options.skipExisting && migrationState.isComplete) {
      itemReport.action = "skipped_already_migrated";
      report.summary.skippedAlreadyMigrated += 1;
      report.summary.skippedExisting += 1;
      report.items.push(itemReport);
      logItem(itemReport);
      return;
    }

    if (migrationState.isPartial) {
      report.summary.incompleteExisting += 1;
      itemReport.incompleteExisting = true;
    }

    const externalUrl = normalizeUrl(candidate.legacyFile.external_url);
    if (!externalUrl) {
      itemReport.action = "skipped_invalid_url";
      report.summary.skippedInvalidUrl += 1;
      report.items.push(itemReport);
      logItem(itemReport);
      return;
    }

    if (options.dryRun) {
      const probe = await probeExternalUrl(externalUrl);
      if (!probe.ok) {
        itemReport.action = probe.reason;
        itemReport.error = probe.error ?? null;
        if (probe.reason === "skipped_unsupported_content_type") {
          report.summary.skippedUnsupported += 1;
        } else {
          report.summary.failedDownload += 1;
          report.summary.errorsCount += 1;
        }
        report.items.push(itemReport);
        logItem(itemReport);
        return;
      }

      itemReport.action = "would_copy";
      itemReport.probe = {
        mimeType: probe.mimeType,
        sizeBytes: probe.sizeBytes,
        filename: probe.filename,
        wouldGenerateThumb: probe.wouldGenerateThumb,
      };
      report.items.push(itemReport);
      logItem(itemReport);
      return;
    }

    if (migrationState.isPartial && migrationState.canRepair) {
      const repaired = await repairPartialMigration(candidate, migrationState, itemReport);
      if (repaired.ok) {
        report.items.push(itemReport);
        logItem(itemReport);
        return;
      }
      itemReport.repairFailed = true;
    }

    if (migrationState.isPartial) {
      const toCleanup = migrationState.r2Files.filter((file) => file.status === "approved");
      if (toCleanup.length > 0) {
        await cleanupOrphanR2Artifacts(toCleanup, itemReport);
      }
    }

    await applyFreshCopy(candidate, externalUrl, itemReport);
    report.items.push(itemReport);
    logItem(itemReport);
  } catch (error) {
    itemReport.action = "error";
    itemReport.error = error.message;
    report.summary.errorsCount += 1;
    report.items.push(itemReport);
    logItem(itemReport);
  }
}

async function assessEntityMigrationState(candidate) {
  const [r2Files, legacyExternalFiles, entity] = await Promise.all([
    loadR2LegacyCopyFiles(candidate),
    loadLegacyExternalFiles(candidate),
    loadEntityRecord(candidate),
  ]);

  const approvedFullFiles = r2Files.filter(
    (file) => file.file_role === "full" && file.status === "approved",
  );
  const approvedThumbFiles = r2Files.filter(
    (file) => file.file_role === "thumb" && file.status === "approved",
  );
  const primaryIsR2 = await isPrimaryR2Logo(candidate, entity.primary_logo_file_id, r2Files);
  const allLegacyArchived =
    legacyExternalFiles.length > 0 &&
    legacyExternalFiles.every((file) => file.status === "archived");
  const hasPendingLegacy = legacyExternalFiles.some((file) => file.status !== "archived");

  const isComplete =
    approvedFullFiles.length > 0 && primaryIsR2 && allLegacyArchived && !hasPendingLegacy;

  const isPartial =
    !isComplete &&
    (approvedFullFiles.length > 0 ||
      approvedThumbFiles.length > 0 ||
      r2Files.length > 0 ||
      (hasPendingLegacy && primaryIsR2));

  const canonicalFull = pickCanonicalFullFile(approvedFullFiles);
  const canonicalThumb = pickCanonicalThumbFile(approvedThumbFiles, canonicalFull?.id ?? null);
  const orphanR2Files = r2Files.filter(
    (file) =>
      file.status === "approved" &&
      file.id !== canonicalFull?.id &&
      file.id !== canonicalThumb?.id,
  );

  const canRepair =
    isPartial &&
    canonicalFull !== null &&
    approvedFullFiles.length === 1 &&
    orphanR2Files.length === 0;

  let kind = "none";
  if (isComplete) {
    kind = "complete";
  } else if (isPartial) {
    kind = "partial";
  }

  return {
    kind,
    isComplete,
    isPartial,
    canRepair,
    entity,
    r2Files,
    approvedFullFiles,
    approvedThumbFiles,
    canonicalFull,
    canonicalThumb,
    orphanR2Files,
    legacyExternalFiles,
    primaryIsR2,
    allLegacyArchived,
    hasPendingLegacy,
  };
}

async function loadR2LegacyCopyFiles(candidate) {
  const { data, error } = await supabase
    .from("files")
    .select(
      "id,file_role,provider,source,status,storage_path,public_url,mime_type,original_filename,created_at",
    )
    .eq("provider", "cloudflare_r2")
    .eq("entity_type", candidate.entityType)
    .eq("entity_id", candidate.entityId)
    .eq("file_category", LOGO_FILE_CATEGORY)
    .in("file_role", ["full", "thumb"])
    .eq("source", "legacy_copy_to_r2")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load R2 legacy copy files: ${error.message}`);
  }
  return data ?? [];
}

async function loadLegacyExternalFiles(candidate) {
  const source =
    candidate.entityType === "company" ? "legacy_company_logo_url" : "legacy_brand_logo_url";

  const { data, error } = await supabase
    .from("files")
    .select("id,status,external_url,source")
    .eq("provider", "external")
    .eq("entity_type", candidate.entityType)
    .eq("entity_id", candidate.entityId)
    .eq("file_category", LOGO_FILE_CATEGORY)
    .eq("source", source);

  if (error) {
    throw new Error(`Failed to load legacy external files: ${error.message}`);
  }
  return data ?? [];
}

async function loadEntityRecord(candidate) {
  if (candidate.entityType === "company") {
    const { data, error } = await supabase
      .from("companies")
      .select("id,primary_logo_file_id,company_logo_url")
      .eq("id", candidate.entityId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load company: ${error.message}`);
    }
    if (!data) {
      throw new Error(`Company not found: ${candidate.entityId}`);
    }
    return data;
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id,primary_logo_file_id,brand_logo_url")
    .eq("id", candidate.entityId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load brand: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Brand not found: ${candidate.entityId}`);
  }
  return data;
}

async function isPrimaryR2Logo(candidate, primaryLogoFileId, r2Files) {
  if (!primaryLogoFileId) {
    return false;
  }

  const fromBatch = r2Files.find((file) => file.id === primaryLogoFileId);
  if (fromBatch) {
    return fromBatch.provider === "cloudflare_r2";
  }

  const { data, error } = await supabase
    .from("files")
    .select("id,provider,entity_type,entity_id,file_category,source")
    .eq("id", primaryLogoFileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load primary logo file: ${error.message}`);
  }

  return (
    data?.provider === "cloudflare_r2" &&
    data.entity_type === candidate.entityType &&
    data.entity_id === candidate.entityId &&
    data.file_category === LOGO_FILE_CATEGORY
  );
}

function pickCanonicalFullFile(fullFiles) {
  if (fullFiles.length === 0) {
    return null;
  }
  return [...fullFiles].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

function pickCanonicalThumbFile(thumbFiles, fullFileId) {
  if (thumbFiles.length === 0) {
    return null;
  }
  if (thumbFiles.length === 1) {
    return thumbFiles[0];
  }
  return [...thumbFiles].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

async function repairPartialMigration(candidate, migrationState, itemReport) {
  const runArtifacts = createRunArtifacts();
  const organizationId = candidate.legacyFile.organization_id ?? env.defaultOrganizationId;
  const fullFile = migrationState.canonicalFull;

  try {
    let thumbFile = migrationState.canonicalThumb;

    if (!thumbFile && fullFile.mime_type && canGenerateThumb(fullFile.mime_type)) {
      const sourceBuffer = await downloadBufferFromUrl(fullFile.public_url ?? fullFile.storage_path);
      if (!sourceBuffer.ok) {
        throw new Error(sourceBuffer.error ?? "Failed to download existing full logo for thumb repair.");
      }

      const thumbSource = await generateLogoThumbnail({
        sourceBuffer: sourceBuffer.buffer,
        sourceMimeType: fullFile.mime_type,
        sourceFilename: fullFile.original_filename ?? "logo.png",
      });

      if (thumbSource) {
        const thumbInserted = await createThumbFromSource({
          candidate,
          organizationId,
          thumbSource,
          runArtifacts,
        });
        if (!thumbInserted.ok) {
          await cleanupPartialRun(runArtifacts, itemReport);
          itemReport.action = thumbInserted.action;
          itemReport.error = thumbInserted.error;
          return { ok: false };
        }
        thumbFile = thumbInserted.data;
        report.summary.copiedThumbs += 1;
      }
    }

    const finalized = await finalizeMigration(candidate, {
      fullFile,
      thumbFile,
      legacyFileIds: migrationState.legacyExternalFiles
        .filter((file) => file.status !== "archived")
        .map((file) => file.id),
      runArtifacts,
      itemReport,
    });

    if (!finalized.ok) {
      if (itemReport.action !== "failed_archive_legacy") {
        await cleanupPartialRun(runArtifacts, itemReport);
      }
      return { ok: false };
    }

    itemReport.action = "repaired_partial";
    itemReport.fullFileId = fullFile.id;
    itemReport.thumbFileId = thumbFile?.id ?? null;
    itemReport.primaryFileId = finalized.primaryFileId;
    report.summary.repairedPartial += 1;
    return { ok: true };
  } catch (error) {
    await cleanupPartialRun(runArtifacts, itemReport);
    itemReport.action = "failed_repair_partial";
    itemReport.error = error.message;
    return { ok: false };
  }
}

async function applyFreshCopy(candidate, externalUrl, itemReport) {
  const runArtifacts = createRunArtifacts();

  const downloaded = await downloadExternalUrl(externalUrl);
  if (!downloaded.ok) {
    itemReport.action = downloaded.reason;
    itemReport.error = downloaded.error ?? null;
    if (downloaded.reason === "skipped_unsupported_content_type") {
      report.summary.skippedUnsupported += 1;
    } else {
      report.summary.failedDownload += 1;
      report.summary.errorsCount += 1;
    }
    return;
  }

  const organizationId = candidate.legacyFile.organization_id ?? env.defaultOrganizationId;
  const fullFileId = randomUUID();
  const fullStoragePath = buildLogoStoragePath({
    candidate,
    fileId: fullFileId,
    filename: downloaded.filename,
    fileRole: "full",
  });
  const fullPublicUrl = buildR2PublicUrl(fullStoragePath);

  try {
    await uploadToR2({
      storagePath: fullStoragePath,
      body: downloaded.buffer,
      contentType: downloaded.mimeType,
    });
    trackR2Upload(runArtifacts, fullStoragePath);
  } catch (error) {
    itemReport.action = "failed_upload";
    itemReport.error = error.message;
    report.summary.failedUpload += 1;
    report.summary.errorsCount += 1;
    return;
  }

  const fullPayload = buildFileInsertPayload({
    fileId: fullFileId,
    candidate,
    organizationId,
    fileRole: "full",
    storagePath: fullStoragePath,
    publicUrl: fullPublicUrl,
    originalFilename: downloaded.filename,
    mimeType: downloaded.mimeType,
    sizeBytes: downloaded.buffer.byteLength,
  });

  const fullInserted = await insertFileRow(fullPayload);
  if (!fullInserted.ok) {
    await cleanupPartialRun(runArtifacts, itemReport);
    itemReport.action = "failed_db_insert";
    itemReport.error = fullInserted.error;
    report.summary.failedDbInsert += 1;
    report.summary.errorsCount += 1;
    return;
  }

  trackFileInsert(runArtifacts, fullInserted.data.id);
  report.summary.copiedFull += 1;

  let thumbFile = null;
  const thumbSource = await generateLogoThumbnail({
    sourceBuffer: downloaded.buffer,
    sourceMimeType: downloaded.mimeType,
    sourceFilename: downloaded.filename,
  });

  if (thumbSource) {
    const thumbInserted = await createThumbFromSource({
      candidate,
      organizationId,
      thumbSource,
      runArtifacts,
    });
    if (!thumbInserted.ok) {
      await cleanupPartialRun(runArtifacts, itemReport);
      itemReport.action = thumbInserted.action;
      itemReport.error = thumbInserted.error;
      if (thumbInserted.action?.includes("upload")) {
        report.summary.failedUpload += 1;
      } else {
        report.summary.failedDbInsert += 1;
      }
      report.summary.errorsCount += 1;
      return;
    }
    thumbFile = thumbInserted.data;
    report.summary.copiedThumbs += 1;
  }

  const finalized = await finalizeMigration(candidate, {
    fullFile: fullInserted.data,
    thumbFile,
    legacyFileIds: [candidate.legacyFile.id],
    runArtifacts,
    itemReport,
  });

  if (!finalized.ok) {
    if (itemReport.action !== "failed_archive_legacy") {
      await cleanupPartialRun(runArtifacts, itemReport);
    }
    report.summary.errorsCount += 1;
    return;
  }

  itemReport.action = "copied";
  itemReport.fullFileId = fullInserted.data.id;
  itemReport.thumbFileId = thumbFile?.id ?? null;
  itemReport.primaryFileId = finalized.primaryFileId;
}

async function createThumbFromSource({ candidate, organizationId, thumbSource, runArtifacts }) {
  const thumbFileId = randomUUID();
  const thumbStoragePath = buildLogoStoragePath({
    candidate,
    fileId: thumbFileId,
    filename: thumbSource.filename,
    fileRole: "thumb",
  });
  const thumbPublicUrl = buildR2PublicUrl(thumbStoragePath);

  try {
    await uploadToR2({
      storagePath: thumbStoragePath,
      body: thumbSource.buffer,
      contentType: thumbSource.mimeType,
    });
    trackR2Upload(runArtifacts, thumbStoragePath);
  } catch (error) {
    return { ok: false, action: "failed_upload_thumb", error: error.message };
  }

  const thumbPayload = buildFileInsertPayload({
    fileId: thumbFileId,
    candidate,
    organizationId,
    fileRole: "thumb",
    storagePath: thumbStoragePath,
    publicUrl: thumbPublicUrl,
    originalFilename: thumbSource.filename,
    mimeType: thumbSource.mimeType,
    sizeBytes: thumbSource.buffer.byteLength,
  });

  const thumbResult = await insertFileRow(thumbPayload);
  if (!thumbResult.ok) {
    await safeDeleteR2Object(thumbStoragePath);
    const index = runArtifacts.r2Paths.indexOf(thumbStoragePath);
    if (index >= 0) {
      runArtifacts.r2Paths.splice(index, 1);
    }
    return { ok: false, action: "failed_db_insert_thumb", error: thumbResult.error };
  }

  trackFileInsert(runArtifacts, thumbResult.data.id);
  return { ok: true, data: thumbResult.data };
}

async function finalizeMigration(
  candidate,
  { fullFile, thumbFile, legacyFileIds, runArtifacts, itemReport },
) {
  const selectedPrimaryFileId = thumbFile?.id ?? fullFile.id;
  const selectedPrimaryUrl = thumbFile?.public_url ?? fullFile.public_url;

  const pointerUpdated = await updatePrimaryPointer(candidate, {
    primaryFileId: selectedPrimaryFileId,
    primaryUrl: selectedPrimaryUrl,
  });
  if (!pointerUpdated.ok) {
    itemReport.action = "failed_primary_update";
    itemReport.error = pointerUpdated.error;
    return { ok: false };
  }

  report.summary.updatedPrimaryPointers += 1;

  for (const legacyFileId of legacyFileIds) {
    const archived = await archiveLegacyFile(legacyFileId);
    if (!archived.ok) {
      itemReport.action = "failed_archive_legacy";
      itemReport.error = archived.error;
      return { ok: false };
    }
    report.summary.archivedExternalRows += 1;
  }

  runArtifacts.r2Paths.length = 0;
  runArtifacts.fileIds.length = 0;
  return { ok: true, primaryFileId: selectedPrimaryFileId };
}

async function cleanupPartialRun(runArtifacts, itemReport) {
  if (runArtifacts.r2Paths.length === 0 && runArtifacts.fileIds.length === 0) {
    return;
  }

  for (const storagePath of runArtifacts.r2Paths) {
    await safeDeleteR2Object(storagePath);
  }

  if (runArtifacts.fileIds.length > 0) {
    await archiveFileRows(runArtifacts.fileIds);
  }

  report.summary.cleanedPartial += 1;
  itemReport.cleanedPartial = true;
  runArtifacts.r2Paths.length = 0;
  runArtifacts.fileIds.length = 0;
}

async function cleanupOrphanR2Artifacts(orphanFiles, itemReport) {
  const artifacts = createRunArtifacts();
  for (const file of orphanFiles) {
    if (file.storage_path) {
      artifacts.r2Paths.push(file.storage_path);
    }
    artifacts.fileIds.push(file.id);
  }
  await cleanupPartialRun(artifacts, itemReport);
}

async function archiveFileRows(fileIds) {
  const { error } = await supabase.from("files").update({ status: "archived" }).in("id", fileIds);
  if (error) {
    throw new Error(`Failed to archive partial file rows: ${error.message}`);
  }
}

function canGenerateThumb(mimeType) {
  return ["image/png", "image/jpeg", "image/webp"].includes(mimeType);
}

async function downloadBufferFromUrl(urlOrPath) {
  const url = urlOrPath?.startsWith("http")
    ? urlOrPath
    : buildR2PublicUrl(String(urlOrPath ?? "").replace(/^\/+/, ""));

  const result = await fetchWithTimeout(url, { method: "GET" });
  if (!result.ok || result.response.status !== 200) {
    return {
      ok: false,
      error: result.error ?? `HTTP ${result.response?.status ?? "unknown"}`,
    };
  }

  const buffer = Buffer.from(await result.response.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return { ok: false, error: `File exceeds ${MAX_FILE_BYTES} bytes` };
  }

  return { ok: true, buffer };
}

async function probeExternalUrl(externalUrl) {
  const head = await fetchWithTimeout(externalUrl, { method: "HEAD" });
  if (head.ok && head.response.status === 200) {
    return validateProbeResponse(head.response, externalUrl);
  }

  const headStatus = head.response?.status ?? null;
  if (headStatus === 405 || headStatus === 501) {
    const get = await fetchWithTimeout(externalUrl, { method: "GET" });
    if (!get.ok || get.response.status !== 200) {
      return {
        ok: false,
        reason: "failed_download",
        error: `HTTP ${get.response?.status ?? "unknown"} for ${externalUrl}`,
      };
    }
    await cancelResponseBody(get.response);
    return validateProbeResponse(get.response, externalUrl);
  }

  return {
    ok: false,
    reason: "failed_download",
    error: head.error ?? `HTTP ${headStatus ?? "unknown"} for ${externalUrl}`,
  };
}

function validateProbeResponse(response, externalUrl) {
  const mimeType = normalizeMimeType(response.headers.get("content-type"));
  if (!mimeType || !mimeType.startsWith("image/")) {
    return {
      ok: false,
      reason: "skipped_invalid_url",
      error: `Non-image content-type for ${externalUrl}`,
    };
  }
  if (mimeType === "image/gif") {
    return {
      ok: false,
      reason: "skipped_unsupported_content_type",
      error: "GIF logos are skipped in this script.",
    };
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      reason: "skipped_unsupported_content_type",
      error: `Unsupported content-type: ${mimeType}`,
    };
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: "failed_download",
      error: `File exceeds ${MAX_FILE_BYTES} bytes`,
    };
  }

  const filename = inferFilename(externalUrl, mimeType);
  return {
    ok: true,
    mimeType,
    sizeBytes: contentLength > 0 ? contentLength : null,
    filename,
    wouldGenerateThumb: ["image/png", "image/jpeg", "image/webp"].includes(mimeType),
  };
}

async function downloadExternalUrl(externalUrl) {
  const result = await fetchWithTimeout(externalUrl, { method: "GET" });
  if (!result.ok || result.response.status !== 200) {
    return {
      ok: false,
      reason: "failed_download",
      error: result.error ?? `HTTP ${result.response?.status ?? "unknown"}`,
    };
  }

  const mimeType = normalizeMimeType(result.response.headers.get("content-type"));
  if (!mimeType || !mimeType.startsWith("image/")) {
    await cancelResponseBody(result.response);
    return {
      ok: false,
      reason: "skipped_invalid_url",
      error: "Response is not an image.",
    };
  }

  if (mimeType === "image/gif") {
    await cancelResponseBody(result.response);
    console.warn(`[copy:legacy-logos-to-r2] skipping GIF: ${externalUrl}`);
    return {
      ok: false,
      reason: "skipped_unsupported_content_type",
      error: "GIF logos are skipped.",
    };
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    await cancelResponseBody(result.response);
    return {
      ok: false,
      reason: "skipped_unsupported_content_type",
      error: `Unsupported content-type: ${mimeType}`,
    };
  }

  const buffer = Buffer.from(await result.response.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: "failed_download",
      error: `File exceeds ${MAX_FILE_BYTES} bytes`,
    };
  }

  if (looksLikeHtmlOrText(buffer, mimeType)) {
    return {
      ok: false,
      reason: "skipped_invalid_url",
      error: "Downloaded content looks like HTML/text, not an image.",
    };
  }

  const filename = inferFilename(externalUrl, mimeType);
  return {
    ok: true,
    buffer,
    mimeType,
    filename,
  };
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
    });
    return { ok: true, response };
  } catch (error) {
    return {
      ok: false,
      response: null,
      error: error.name === "AbortError" ? `Timeout after ${FETCH_TIMEOUT_MS}ms` : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function cancelResponseBody(response) {
  try {
    if (response.body) {
      await response.body.cancel();
    }
  } catch {
    // ignore
  }
}

function looksLikeHtmlOrText(buffer, mimeType) {
  if (!mimeType.startsWith("image/")) {
    return true;
  }
  const head = buffer.subarray(0, Math.min(buffer.length, 256)).toString("utf8").trim().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("{") || head.startsWith("[");
}

async function generateLogoThumbnail({ sourceBuffer, sourceMimeType, sourceFilename }) {
  if (sourceMimeType === "image/svg+xml") {
    return null;
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(sourceMimeType)) {
    return null;
  }

  const buffer = await sharp(sourceBuffer)
    .resize({ width: 300, height: 300, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  return {
    buffer,
    mimeType: "image/webp",
    filename: replaceExtension(sourceFilename, "webp"),
  };
}

function buildFileInsertPayload({
  fileId,
  candidate,
  organizationId,
  fileRole,
  storagePath,
  publicUrl,
  originalFilename,
  mimeType,
  sizeBytes,
}) {
  const base = {
    id: fileId,
    organization_id: organizationId,
    entity_type: candidate.entityType,
    entity_id: candidate.entityId,
    file_category: LOGO_FILE_CATEGORY,
    file_role: fileRole,
    provider: "cloudflare_r2",
    bucket: env.r2PublicBucket,
    storage_path: storagePath,
    external_url: null,
    public_url: publicUrl,
    original_filename: originalFilename,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    is_public: true,
    source: "legacy_copy_to_r2",
    status: "approved",
    uploaded_by: null,
  };

  if (candidate.entityType === "company") {
    return { ...base, company_id: candidate.entityId, brand_id: null };
  }
  return { ...base, brand_id: candidate.entityId, company_id: null };
}

async function insertFileRow(payload) {
  const { data, error } = await supabase.from("files").insert(payload).select("id,public_url").single();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

async function updatePrimaryPointer(candidate, { primaryFileId, primaryUrl }) {
  if (candidate.entityType === "company") {
    const { error } = await supabase
      .from("companies")
      .update({
        primary_logo_file_id: primaryFileId,
        company_logo_url: primaryUrl,
      })
      .eq("id", candidate.entityId);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  const { error } = await supabase
    .from("brands")
    .update({
      primary_logo_file_id: primaryFileId,
      brand_logo_url: primaryUrl,
    })
    .eq("id", candidate.entityId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function archiveLegacyFile(fileId) {
  const { error } = await supabase.from("files").update({ status: "archived" }).eq("id", fileId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function uploadToR2({ storagePath, body, contentType }) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.r2PublicBucket,
      Key: storagePath,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    }),
  );
}

async function safeDeleteR2Object(storagePath) {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: env.r2PublicBucket,
        Key: storagePath,
      }),
    );
  } catch (error) {
    console.warn(`[copy:legacy-logos-to-r2] cleanup failed for ${storagePath}:`, error.message);
  }
}

function buildLogoStoragePath({ candidate, fileId, filename, fileRole }) {
  return buildStoragePath({
    organizationSlug: env.defaultOrganizationSlug,
    entityType: candidate.entityType,
    fileCategory: "logos",
    fileId,
    filename,
    fileRole,
    companyId: candidate.entityType === "company" ? candidate.entityId : null,
    brandId: candidate.entityType === "brand" ? candidate.entityId : null,
  });
}

function buildStoragePath(params) {
  const safeFilename = sanitizeFilename(params.filename);
  const leaf = `${params.fileId}-${safeFilename}`;
  const scopedCategory =
    (params.entityType === "company" || params.entityType === "brand") &&
    params.fileCategory === "logos" &&
    params.fileRole
      ? `logos/${params.fileRole}`
      : params.fileCategory;

  if (params.entityType === "company") {
    return `organizations/${params.organizationSlug}/companies/${params.companyId}/${scopedCategory}/${leaf}`;
  }
  return `organizations/${params.organizationSlug}/brands/${params.brandId}/${scopedCategory}/${leaf}`;
}

function sanitizeFilename(filename) {
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

function buildR2PublicUrl(storagePath) {
  const baseUrl = env.r2PublicBaseUrl.replace(/\/+$/, "");
  const normalizedPath = storagePath.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}

function createR2Client() {
  const baseConfig = {
    region: "auto",
    endpoint: env.r2Endpoint,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
    forcePathStyle: true,
  };

  return new S3Client(baseConfig);
}

async function fetchAllRows(tableName, buildQuery) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const query = buildQuery(supabase.from(tableName)).range(from, from + pageSize - 1);
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to read ${tableName}: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

async function runWithConcurrency(items, concurrency, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(workers);
}

function inferFilename(url, mimeType) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    if (last && last.includes(".")) {
      return decodeURIComponent(last);
    }
  } catch {
    // ignore
  }
  return `logo.${extensionFromMime(mimeType)}`;
}

function extensionFromMime(mimeType) {
  const map = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return map[mimeType] ?? "bin";
}

function replaceExtension(filename, extension) {
  const clean = filename.trim() || "file";
  const index = clean.lastIndexOf(".");
  const base = index > 0 ? clean.slice(0, index) : clean;
  return `${base}.${extension}`;
}

function normalizeMimeType(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    return null;
  }
  return raw.split(";")[0].trim();
}

function normalizeUrl(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function loadEnvFile(filePath, { override }) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    if (!override && process.env[key] !== undefined) {
      continue;
    }
    const rawValue = match[2];
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function logItem(item) {
  const name = item.entityName ? ` name="${item.entityName}"` : "";
  const details = item.error ? ` error="${item.error}"` : "";
  console.log(
    `[copy:legacy-logos-to-r2] ${item.entityType}:${item.entityId}${name} action=${item.action} url=${item.externalUrl}${details}`,
  );
}

function printSummary() {
  const s = report.summary;
  console.log(`[copy:legacy-logos-to-r2] mode=${report.mode}`);
  console.log(`[copy:legacy-logos-to-r2] candidates found: ${s.candidatesFound}`);
  console.log(`[copy:legacy-logos-to-r2] copied full: ${s.copiedFull}`);
  console.log(`[copy:legacy-logos-to-r2] copied thumbs: ${s.copiedThumbs}`);
  console.log(`[copy:legacy-logos-to-r2] skipped existing: ${s.skippedExisting}`);
  console.log(`[copy:legacy-logos-to-r2] skipped already migrated: ${s.skippedAlreadyMigrated}`);
  console.log(`[copy:legacy-logos-to-r2] incomplete existing: ${s.incompleteExisting}`);
  console.log(`[copy:legacy-logos-to-r2] repaired partial: ${s.repairedPartial}`);
  console.log(`[copy:legacy-logos-to-r2] cleaned partial: ${s.cleanedPartial}`);
  console.log(`[copy:legacy-logos-to-r2] skipped unsupported: ${s.skippedUnsupported}`);
  console.log(`[copy:legacy-logos-to-r2] failed download: ${s.failedDownload}`);
  console.log(`[copy:legacy-logos-to-r2] failed upload: ${s.failedUpload}`);
  console.log(`[copy:legacy-logos-to-r2] failed DB insert: ${s.failedDbInsert}`);
  console.log(`[copy:legacy-logos-to-r2] archived external rows: ${s.archivedExternalRows}`);
  console.log(`[copy:legacy-logos-to-r2] updated primary pointers: ${s.updatedPrimaryPointers}`);
  console.log(`[copy:legacy-logos-to-r2] errors: ${s.errorsCount}`);
}

async function writeReport() {
  const logsDir = path.join(ROOT, "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(logsDir, `copy-legacy-logos-to-r2-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[copy:legacy-logos-to-r2] report: ${reportPath}`);
}
