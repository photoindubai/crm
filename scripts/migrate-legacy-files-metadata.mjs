#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const dryRun = process.argv.includes("--dry-run");
const env = readEnv();
const supabase = createClient(env.url, env.serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const counters = {
  companyLogosRegistered: 0,
  brandLogosRegistered: 0,
  exhibitorMaterialsRegistered: 0,
  skippedDuplicates: 0,
  errors: 0,
};
const ALLOWED_FILE_STATUSES = new Set(["uploaded", "pending_review", "approved", "rejected", "archived"]);

const state = {
  companyExisting: new Map(),
  brandExisting: new Map(),
  materialExisting: new Map(),
};

main()
  .then(() => {
    printSummary();
    if (counters.errors > 0) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("[migrate:legacy-files] fatal:", error.message);
    process.exit(1);
  });

async function main() {
  await ensureDefaultOrganizationExists();
  await loadExistingLegacyFiles();
  await migrateCompanyLogos();
  await migrateBrandLogos();
  await migrateExhibitorMaterials();
}

function readEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const defaultOrganizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!url) {
    throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required.");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }
  if (!defaultOrganizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is required.");
  }
  if (!isUuid(defaultOrganizationId)) {
    throw new Error(`DEFAULT_ORGANIZATION_ID is not a valid UUID: ${defaultOrganizationId}`);
  }

  return { url, serviceRoleKey, defaultOrganizationId };
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
    throw new Error(`DEFAULT_ORGANIZATION_ID not found in organizations: ${env.defaultOrganizationId}`);
  }
}

async function loadExistingLegacyFiles() {
  const allRows = await fetchAllRows("files", (query) =>
    query
      .select("id,entity_type,entity_id,file_category,source,external_url,participation_id")
      .eq("provider", "external")
      .in("source", ["legacy_company_logo_url", "legacy_brand_logo_url", "legacy_exhibitor_materials_url"]),
  );

  for (const row of allRows) {
    if (row.source === "legacy_company_logo_url") {
      state.companyExisting.set(companyKey(row.entity_id, row.external_url), row.id);
      continue;
    }
    if (row.source === "legacy_brand_logo_url") {
      state.brandExisting.set(brandKey(row.entity_id, row.external_url), row.id);
      continue;
    }
    if (row.source === "legacy_exhibitor_materials_url" && row.participation_id) {
      state.materialExisting.set(materialKey(row.participation_id, row.external_url), row.id);
    }
  }
}

async function migrateCompanyLogos() {
  const companies = await fetchAllRows("companies", (query) =>
    query.select("id,organization_id,company_logo_url,primary_logo_file_id").not("company_logo_url", "is", null).neq("company_logo_url", ""),
  );

  for (const company of companies) {
    try {
      const externalUrl = normalizeUrl(company.company_logo_url);
      if (!externalUrl) {
        continue;
      }

      const key = companyKey(company.id, externalUrl);
      let fileId = state.companyExisting.get(key);

      if (!fileId) {
        const payload = {
          organization_id: company.organization_id ?? env.defaultOrganizationId,
          company_id: company.id,
          entity_type: "company",
          entity_id: company.id,
          file_category: "logo",
          file_role: "legacy_external",
          provider: "external",
          bucket: "external",
          storage_path: null,
          external_url: externalUrl,
          public_url: externalUrl,
          is_public: true,
          source: "legacy_company_logo_url",
          status: "approved",
        };

        if (!dryRun) {
          const { data, error } = await supabase.from("files").insert(payload).select("id").single();
          if (error) {
            throw new Error(error.message);
          }
          fileId = data.id;
        } else {
          fileId = `dry-run-company-${company.id}`;
        }

        state.companyExisting.set(key, fileId);
        counters.companyLogosRegistered += 1;
      } else {
        counters.skippedDuplicates += 1;
      }

      if (!company.primary_logo_file_id && fileId && !dryRun) {
        const { error } = await supabase.from("companies").update({ primary_logo_file_id: fileId }).eq("id", company.id);
        if (error) {
          throw new Error(error.message);
        }
      }
    } catch (error) {
      counters.errors += 1;
      console.error(`[migrate:legacy-files][company:${company.id}]`, error.message);
    }
  }
}

async function migrateBrandLogos() {
  const brands = await fetchAllRows("brands", (query) =>
    query.select("id,organization_id,brand_logo_url,primary_logo_file_id").not("brand_logo_url", "is", null).neq("brand_logo_url", ""),
  );

  for (const brand of brands) {
    try {
      const externalUrl = normalizeUrl(brand.brand_logo_url);
      if (!externalUrl) {
        continue;
      }

      const key = brandKey(brand.id, externalUrl);
      let fileId = state.brandExisting.get(key);

      if (!fileId) {
        const payload = {
          organization_id: brand.organization_id ?? env.defaultOrganizationId,
          brand_id: brand.id,
          entity_type: "brand",
          entity_id: brand.id,
          file_category: "logo",
          file_role: "legacy_external",
          provider: "external",
          bucket: "external",
          storage_path: null,
          external_url: externalUrl,
          public_url: externalUrl,
          is_public: true,
          source: "legacy_brand_logo_url",
          status: "approved",
        };

        if (!dryRun) {
          const { data, error } = await supabase.from("files").insert(payload).select("id").single();
          if (error) {
            throw new Error(error.message);
          }
          fileId = data.id;
        } else {
          fileId = `dry-run-brand-${brand.id}`;
        }

        state.brandExisting.set(key, fileId);
        counters.brandLogosRegistered += 1;
      } else {
        counters.skippedDuplicates += 1;
      }

      if (!brand.primary_logo_file_id && fileId && !dryRun) {
        const { error } = await supabase.from("brands").update({ primary_logo_file_id: fileId }).eq("id", brand.id);
        if (error) {
          throw new Error(error.message);
        }
      }
    } catch (error) {
      counters.errors += 1;
      console.error(`[migrate:legacy-files][brand:${brand.id}]`, error.message);
    }
  }
}

async function migrateExhibitorMaterials() {
  const participations = await fetchAllRows("participations", (query) =>
    query.select("id,organization_id,event_id,company_id"),
  );
  const participationMap = new Map(participations.map((item) => [item.id, item]));

  const materials = await fetchAllRows("exhibitor_materials", (query) =>
    query.select("id,participation_id,url,material_type,status").not("url", "is", null).neq("url", "").not("participation_id", "is", null),
  );

  for (const material of materials) {
    try {
      const externalUrl = normalizeUrl(material.url);
      if (!externalUrl) {
        continue;
      }

      const participation = participationMap.get(material.participation_id);
      if (!participation) {
        counters.errors += 1;
        console.error(`[migrate:legacy-files][material:${material.id}] participation not found: ${material.participation_id}`);
        continue;
      }

      const key = materialKey(participation.id, externalUrl);
      if (state.materialExisting.has(key)) {
        counters.skippedDuplicates += 1;
        continue;
      }

      const fileCategory = normalizeText(material.material_type) ?? "material";
      const status = normalizeMaterialStatus(material.status);

      const payload = {
        organization_id: participation.organization_id ?? env.defaultOrganizationId,
        event_id: participation.event_id,
        company_id: participation.company_id,
        participation_id: participation.id,
        entity_type: "participation",
        entity_id: participation.id,
        file_category: fileCategory,
        file_role: "legacy_external",
        provider: "external",
        bucket: "external",
        storage_path: null,
        external_url: externalUrl,
        public_url: externalUrl,
        is_public: true,
        source: "legacy_exhibitor_materials_url",
        status,
      };

      if (!dryRun) {
        const { data, error } = await supabase.from("files").insert(payload).select("id").single();
        if (error) {
          throw new Error(error.message);
        }
        state.materialExisting.set(key, data.id);
      } else {
        state.materialExisting.set(key, `dry-run-material-${material.id}`);
      }

      counters.exhibitorMaterialsRegistered += 1;
    } catch (error) {
      counters.errors += 1;
      console.error(`[migrate:legacy-files][material:${material.id}]`, error.message);
    }
  }
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

function companyKey(companyId, externalUrl) {
  return `company|${companyId}|logo|legacy_company_logo_url|${externalUrl}`;
}

function brandKey(brandId, externalUrl) {
  return `brand|${brandId}|logo|legacy_brand_logo_url|${externalUrl}`;
}

function materialKey(participationId, externalUrl) {
  return `participation|${participationId}|legacy_exhibitor_materials_url|${externalUrl}`;
}

function normalizeUrl(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeText(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function normalizeMaterialStatus(value) {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) {
    return "uploaded";
  }
  if (ALLOWED_FILE_STATUSES.has(normalized)) {
    return normalized;
  }

  const mapped = {
    received: "uploaded",
    uploaded: "uploaded",
    draft: "uploaded",
    missing: "uploaded",
    pending: "pending_review",
    review: "pending_review",
    in_review: "pending_review",
    ready: "approved",
    approved: "approved",
    completed: "approved",
    rejected: "rejected",
    declined: "rejected",
    archived: "archived",
  }[normalized];

  return mapped ?? "uploaded";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function printSummary() {
  console.log(`[migrate:legacy-files] mode=${dryRun ? "dry-run" : "apply"}`);
  console.log(`[migrate:legacy-files] company logos registered: ${counters.companyLogosRegistered}`);
  console.log(`[migrate:legacy-files] brand logos registered: ${counters.brandLogosRegistered}`);
  console.log(`[migrate:legacy-files] exhibitor materials registered: ${counters.exhibitorMaterialsRegistered}`);
  console.log(`[migrate:legacy-files] skipped duplicates: ${counters.skippedDuplicates}`);
  console.log(`[migrate:legacy-files] errors: ${counters.errors}`);
}
