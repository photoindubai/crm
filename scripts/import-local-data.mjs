#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localDataDir = path.join(projectRoot, "local-data");
const logosFile = "/home/anton/projects/heshs/script/output/exhibitors-logos-full-urls.json";
const isDryRun = process.argv.includes("--dry-run");

loadDotEnv(path.join(projectRoot, ".env"));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const csvFiles = {
  companies: "Exhibitors info HESHS2026 - Companies.csv",
  contacts: "Exhibitors info HESHS2026 - Contacts.csv",
  brands: "Exhibitors info HESHS2026 - Brands.csv",
  brandAssignments: "Exhibitors info HESHS2026 - Brand_Assignments.csv",
  logistics: "Exhibitors info HESHS2026 - Logistics.csv",
};

const rows = Object.fromEntries(
  Object.entries(csvFiles).map(([key, file]) => [key, readCsv(path.join(localDataDir, file))]),
);
const logoExport = JSON.parse(fs.readFileSync(logosFile, "utf8"));
const logoByName = new Map(
  (logoExport.exhibitors ?? []).map((item) => [normalizeName(item.ExhibitorName), item]),
);

const summary = {
  dryRun: isDryRun,
  source: {
    companies: rows.companies.length,
    contacts: rows.contacts.length,
    brands: rows.brands.length,
    brandAssignments: rows.brandAssignments.length,
    logistics: rows.logistics.length,
    logoRecords: logoExport.exhibitors?.length ?? 0,
  },
  imported: {
    companies: 0,
    contacts: 0,
    companyContacts: 0,
    brands: 0,
    companyBrands: 0,
    participationBrands: 0,
    participations: 0,
    booths: 0,
    boothAssignments: 0,
    logistics: 0,
    materials: 0,
  },
  warnings: [],
};

await main();
console.log(JSON.stringify(summary, null, 2));

async function main() {
  const organization = await getRequiredSingle(
    "organizations",
    "id,name,slug",
    { slug: "hesh" },
    "default organization hesh",
  );
  const event = await getRequiredSingle(
    "events",
    "id,event_name,event_slug",
    { event_slug: "hesh-2026" },
    "default event hesh-2026",
  );

  validateSources();

  if (isDryRun) {
    return;
  }

  const companyBySourceId = new Map();
  for (const row of rows.companies) {
    const logo = logoByName.get(normalizeName(row.Name));
    const company = await upsertBySourceId("companies", "source_appsheet_id", row.ID_Company, {
      organization_id: organization.id,
      source_appsheet_id: row.ID_Company,
      company_name: required(row.Name, `company ${row.ID_Company} name`),
      website: emptyToNull(row.Website),
      description: emptyToNull(row.Description),
      country: emptyToNull(row.Country),
      city: emptyToNull(row.City),
      company_logo_url:
        emptyToNull(logo?.Logo?.urls?.original) ??
        emptyToNull(row.Company_Logo_original) ??
        emptyToNull(row.Company_Logo),
    });
    companyBySourceId.set(row.ID_Company, company);
    summary.imported.companies += 1;
  }

  const participationByCompanySourceId = new Map();
  const boothByNumber = new Map();
  for (const row of rows.companies) {
    const company = companyBySourceId.get(row.ID_Company);
    const participation = await upsertParticipation({
      organization_id: organization.id,
      event_id: event.id,
      company_id: company.id,
      participation_type: "exhibitor",
      status: "confirmed",
      booking_status: "confirmed",
      profile_status: emptyToNull(row.Description) ? "completed" : "not_started",
      materials_status: company.company_logo_url ? "received" : "missing",
    });
    participationByCompanySourceId.set(row.ID_Company, participation);
    summary.imported.participations += 1;

    const standNumbers = splitStandNumbers(row.Stand_Numbers);
    for (const boothNumber of standNumbers) {
      const booth = await getOrCreateBooth(event.id, boothNumber, boothByNumber);
      summary.imported.booths += booth.created ? 1 : 0;
      await upsertBoothAssignment(participation.id, booth.id);
      summary.imported.boothAssignments += 1;
    }

    await upsertLogoMaterials(participation.id, row, logoByName.get(normalizeName(row.Name)));
  }

  const brandBySourceId = new Map();
  for (const row of rows.brands) {
    const brand = await upsertBySourceId("brands", "source_appsheet_id", row.ID_Brand, {
      organization_id: organization.id,
      source_appsheet_id: row.ID_Brand,
      brand_name: required(row.Brand_Name, `brand ${row.ID_Brand} name`),
      brand_description: emptyToNull(row.Brand_Description),
      brand_logo_url: emptyToNull(row.Brand_Logo),
    });
    brandBySourceId.set(row.ID_Brand, brand);
    summary.imported.brands += 1;
  }

  for (const row of rows.contacts) {
    const contact = await upsertBySourceId("contacts", "source_appsheet_id", row.ID_Contact, {
      organization_id: organization.id,
      source_appsheet_id: row.ID_Contact,
      first_name: emptyToNull(row.First_Name),
      last_name: emptyToNull(row.Last_Name),
      email: emptyToNull(row.Email),
      phone: emptyToNull(row.Phone),
      position: emptyToNull(row.Position),
    });
    summary.imported.contacts += 1;

    const company = companyBySourceId.get(row.ID_Company);
    await upsertBySourceId("company_contacts", "source_appsheet_id", row.ID_Contact, {
      source_appsheet_id: row.ID_Contact,
      company_id: company.id,
      contact_id: contact.id,
      role: emptyToNull(row.Position) ?? "General contact",
      is_primary: parseBoolean(row.Is_Primary),
    });
    summary.imported.companyContacts += 1;
  }

  for (const row of rows.brandAssignments) {
    const company = companyBySourceId.get(row.ID_Company);
    const brand = brandBySourceId.get(row.ID_Brand);
    const participation = participationByCompanySourceId.get(row.ID_Company);

    await upsertJoin("company_brands", { company_id: company.id, brand_id: brand.id });
    summary.imported.companyBrands += 1;
    await upsertJoin(
      "participation_brands",
      {
        participation_id: participation.id,
        brand_id: brand.id,
        display_on_website: true,
      },
      ["participation_id", "brand_id"],
    );
    summary.imported.participationBrands += 1;
  }

  for (const row of rows.logistics) {
    const participation = participationByCompanySourceId.get(row.ID_Company);
    await upsertBySourceId("participation_logistics", "source_appsheet_id", row.ID_Log, {
      source_appsheet_id: row.ID_Log,
      participation_id: participation.id,
      badges_status: boolStatus(row.Badges),
      room_asset_status: boolStatus(row.Room_Asset),
      check_in_status: boolStatus(row.Check_in),
      furniture_status: boolStatus(row.Furniture),
    });
    summary.imported.logistics += 1;
  }
}

function validateSources() {
  const companyIds = new Set(rows.companies.map((row) => row.ID_Company));
  const brandIds = new Set(rows.brands.map((row) => row.ID_Brand));

  for (const row of rows.contacts) {
    if (!companyIds.has(row.ID_Company)) {
      summary.warnings.push(`Contact ${row.ID_Contact} references missing company ${row.ID_Company}`);
    }
  }
  for (const row of rows.brandAssignments) {
    if (!companyIds.has(row.ID_Company)) {
      summary.warnings.push(`Brand link ${row.ID_Link} references missing company ${row.ID_Company}`);
    }
    if (!brandIds.has(row.ID_Brand)) {
      summary.warnings.push(`Brand link ${row.ID_Link} references missing brand ${row.ID_Brand}`);
    }
  }
  for (const row of rows.logistics) {
    if (!companyIds.has(row.ID_Company)) {
      summary.warnings.push(`Logistics ${row.ID_Log} references missing company ${row.ID_Company}`);
    }
  }
  for (const row of rows.companies) {
    if (!logoByName.has(normalizeName(row.Name))) {
      summary.warnings.push(`No JSON logo match for company: ${row.Name}`);
    }
  }

  if (summary.warnings.some((warning) => /references missing/.test(warning))) {
    throw new Error("Source validation failed. See warnings in summary.");
  }
}

async function upsertBySourceId(table, sourceColumn, sourceId, payload) {
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("id,*")
    .eq(sourceColumn, sourceId)
    .maybeSingle();
  assertNoError(selectError, `select ${table} ${sourceId}`);

  if (existing) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    assertNoError(error, `update ${table} ${sourceId}`);
    return data;
  }

  const { data, error } = await supabase.from(table).insert(payload).select().single();
  assertNoError(error, `insert ${table} ${sourceId}`);
  return data;
}

async function upsertParticipation(payload) {
  const { data, error } = await supabase
    .from("participations")
    .upsert(payload, { onConflict: "event_id,company_id" })
    .select()
    .single();
  assertNoError(error, `upsert participation ${payload.company_id}`);
  return data;
}

async function getOrCreateBooth(eventId, boothNumber, cache) {
  const cacheKey = `${eventId}:${boothNumber}`;
  if (cache.has(cacheKey)) {
    return { ...cache.get(cacheKey), created: false };
  }

  const { data: existing, error: selectError } = await supabase
    .from("booths")
    .select("*")
    .eq("event_id", eventId)
    .eq("booth_number", boothNumber)
    .maybeSingle();
  assertNoError(selectError, `select booth ${boothNumber}`);

  if (existing) {
    cache.set(cacheKey, existing);
    return { ...existing, created: false };
  }

  const { data, error } = await supabase
    .from("booths")
    .insert({
      event_id: eventId,
      booth_number: boothNumber,
      status: "booked",
    })
    .select()
    .single();
  assertNoError(error, `insert booth ${boothNumber}`);
  cache.set(cacheKey, data);
  return { ...data, created: true };
}

async function upsertBoothAssignment(participationId, boothId) {
  const { error } = await supabase
    .from("booth_assignments")
    .upsert(
      {
        participation_id: participationId,
        booth_id: boothId,
      },
      { onConflict: "participation_id,booth_id" },
    );
  assertNoError(error, `upsert booth assignment ${participationId}:${boothId}`);
}

async function upsertJoin(table, payload, conflictColumns) {
  const columns =
    conflictColumns ?? Object.keys(payload).filter((key) => payload[key] !== undefined);
  const { error } = await supabase.from(table).upsert(payload, { onConflict: columns.join(",") });
  assertNoError(error, `upsert ${table}`);
}

async function upsertLogoMaterials(participationId, row, logo) {
  const materialRows = [
    ["company_logo_original", logo?.Logo?.urls?.original ?? row.Company_Logo_original],
    ["company_logo_small", logo?.Logo?.urls?.small ?? row.Company_Logo],
    ["company_logo_thumbnail", logo?.Logo?.urls?.thumbnail ?? row.Company_thumb],
    ["company_logo_inverted", logo?.LogoInverted?.urls?.original],
  ]
    .map(([title, url]) => ({ title, url: emptyToNull(url) }))
    .filter((item) => item.url);

  for (const material of materialRows) {
    const { data: existing, error: selectError } = await supabase
      .from("exhibitor_materials")
      .select("id")
      .eq("participation_id", participationId)
      .eq("title", material.title)
      .maybeSingle();
    assertNoError(selectError, `select material ${material.title}`);

    const payload = {
      participation_id: participationId,
      material_type: "logo",
      title: material.title,
      url: material.url,
      status: "received",
    };

    const query = existing
      ? supabase.from("exhibitor_materials").update(payload).eq("id", existing.id)
      : supabase.from("exhibitor_materials").insert(payload);
    const { error } = await query;
    assertNoError(error, `upsert material ${material.title}`);
    summary.imported.materials += 1;
  }
}

async function getRequiredSingle(table, select, filters, label) {
  let query = supabase.from(table).select(select);
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }
  const { data, error } = await query.single();
  assertNoError(error, `load ${label}`);
  return data;
}

function readCsv(file) {
  return parse(fs.readFileSync(file, "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) {
    return;
  }
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function emptyToNull(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function required(value, label) {
  const normalized = emptyToNull(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function parseBoolean(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function boolStatus(value) {
  return parseBoolean(value) ? "completed" : "not_started";
}

function splitStandNumbers(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function assertNoError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}
