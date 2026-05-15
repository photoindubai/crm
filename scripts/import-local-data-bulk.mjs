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

  const companyRows = rows.companies.map((row) => {
    const logo = logoByName.get(normalizeName(row.Name));
    return {
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
    };
  });
  await bulkUpsert("companies", companyRows, "organization_id,source_appsheet_id");
  summary.imported.companies = companyRows.length;

  const companyBySourceId = await mapBySourceId("companies");

  const participationRows = rows.companies.map((row) => {
    const company = companyBySourceId.get(row.ID_Company);
    return {
      organization_id: organization.id,
      event_id: event.id,
      company_id: company.id,
      participation_type: "exhibitor",
      status: "confirmed",
      booking_status: "confirmed",
      profile_status: emptyToNull(row.Description) ? "completed" : "not_started",
      materials_status: company.company_logo_url ? "received" : "missing",
    };
  });
  await bulkUpsert("participations", participationRows, "event_id,company_id");
  summary.imported.participations = participationRows.length;

  const participationByCompanyId = await mapParticipationsByCompanyId(event.id);
  const participationByCompanySourceId = new Map(
    rows.companies.map((row) => [
      row.ID_Company,
      participationByCompanyId.get(companyBySourceId.get(row.ID_Company).id),
    ]),
  );

  const boothNumbers = [
    ...new Set(rows.companies.flatMap((row) => splitStandNumbers(row.Stand_Numbers))),
  ];
  await bulkUpsert(
    "booths",
    boothNumbers.map((boothNumber) => ({
      event_id: event.id,
      booth_number: boothNumber,
      status: "booked",
    })),
    "event_id,booth_number",
  );
  summary.imported.booths = boothNumbers.length;

  const boothByNumber = await mapBoothsByNumber(event.id);
  const boothAssignmentRows = rows.companies.flatMap((row) => {
    const participation = participationByCompanySourceId.get(row.ID_Company);
    return splitStandNumbers(row.Stand_Numbers).map((boothNumber) => ({
      participation_id: participation.id,
      booth_id: boothByNumber.get(boothNumber).id,
    }));
  });
  await bulkUpsert("booth_assignments", boothAssignmentRows, "participation_id,booth_id");
  summary.imported.boothAssignments = boothAssignmentRows.length;

  const materialRows = rows.companies.flatMap((row) =>
    logoMaterialRows(
      participationByCompanySourceId.get(row.ID_Company).id,
      row,
      logoByName.get(normalizeName(row.Name)),
    ),
  );
  await bulkUpsert("exhibitor_materials", materialRows, "participation_id,title");
  summary.imported.materials = materialRows.length;

  const brandRows = rows.brands.map((row) => ({
    organization_id: organization.id,
    source_appsheet_id: row.ID_Brand,
    brand_name: required(row.Brand_Name, `brand ${row.ID_Brand} name`),
    brand_description: emptyToNull(row.Brand_Description),
    brand_logo_url: emptyToNull(row.Brand_Logo),
  }));
  await bulkUpsert("brands", brandRows, "organization_id,source_appsheet_id");
  summary.imported.brands = brandRows.length;

  const brandBySourceId = await mapBySourceId("brands");

  const contactRows = rows.contacts.map((row) => ({
    organization_id: organization.id,
    source_appsheet_id: row.ID_Contact,
    first_name: emptyToNull(row.First_Name),
    last_name: emptyToNull(row.Last_Name),
    email: emptyToNull(row.Email),
    phone: emptyToNull(row.Phone),
    position: emptyToNull(row.Position),
  }));
  await bulkUpsert("contacts", contactRows, "organization_id,source_appsheet_id");
  summary.imported.contacts = contactRows.length;

  const contactBySourceId = await mapBySourceId("contacts");

  const companyContactRows = rows.contacts.map((row) => ({
    source_appsheet_id: row.ID_Contact,
    company_id: companyBySourceId.get(row.ID_Company).id,
    contact_id: contactBySourceId.get(row.ID_Contact).id,
    role: emptyToNull(row.Position) ?? "General contact",
    is_primary: parseBoolean(row.Is_Primary),
  }));
  await bulkUpsert("company_contacts", companyContactRows, "source_appsheet_id");
  summary.imported.companyContacts = companyContactRows.length;

  const companyBrandRows = rows.brandAssignments.map((row) => ({
    company_id: companyBySourceId.get(row.ID_Company).id,
    brand_id: brandBySourceId.get(row.ID_Brand).id,
  }));
  await bulkUpsert("company_brands", companyBrandRows, "company_id,brand_id");
  summary.imported.companyBrands = companyBrandRows.length;

  const participationBrandRows = rows.brandAssignments.map((row) => ({
    participation_id: participationByCompanySourceId.get(row.ID_Company).id,
    brand_id: brandBySourceId.get(row.ID_Brand).id,
    display_on_website: true,
  }));
  await bulkUpsert("participation_brands", participationBrandRows, "participation_id,brand_id");
  summary.imported.participationBrands = participationBrandRows.length;

  const logisticsRows = rows.logistics.map((row) => ({
    source_appsheet_id: row.ID_Log,
    participation_id: participationByCompanySourceId.get(row.ID_Company).id,
    badges_status: boolStatus(row.Badges),
    room_asset_status: boolStatus(row.Room_Asset),
    check_in_status: boolStatus(row.Check_in),
    furniture_status: boolStatus(row.Furniture),
  }));
  await bulkUpsert("participation_logistics", logisticsRows, "source_appsheet_id");
  summary.imported.logistics = logisticsRows.length;
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

async function bulkUpsert(table, payload, onConflict) {
  if (payload.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict })
    .select("id");
  assertNoError(error, `bulk upsert ${table}`);
  return data;
}

function logoMaterialRows(participationId, row, logo) {
  return [
    ["company_logo_original", logo?.Logo?.urls?.original ?? row.Company_Logo_original],
    ["company_logo_small", logo?.Logo?.urls?.small ?? row.Company_Logo],
    ["company_logo_thumbnail", logo?.Logo?.urls?.thumbnail ?? row.Company_thumb],
    ["company_logo_inverted", logo?.LogoInverted?.urls?.original],
  ]
    .map(([title, url]) => ({
      participation_id: participationId,
      material_type: "logo",
      title,
      url: emptyToNull(url),
      status: "received",
    }))
    .filter((item) => item.url);
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

async function mapBySourceId(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .not("source_appsheet_id", "is", null);
  assertNoError(error, `map ${table} by source_appsheet_id`);
  return new Map(data.map((row) => [row.source_appsheet_id, row]));
}

async function mapParticipationsByCompanyId(eventId) {
  const { data, error } = await supabase
    .from("participations")
    .select("*")
    .eq("event_id", eventId);
  assertNoError(error, "map participations by company");
  return new Map(data.map((row) => [row.company_id, row]));
}

async function mapBoothsByNumber(eventId) {
  const { data, error } = await supabase.from("booths").select("*").eq("event_id", eventId);
  assertNoError(error, "map booths by number");
  return new Map(data.map((row) => [row.booth_number, row]));
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

