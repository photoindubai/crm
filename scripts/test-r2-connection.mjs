import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const ROOT = process.cwd();
const TEST_KEY = "test/r2-smoke-test.txt";
const TEST_BODY = "r2 smoke test";

loadEnvFile(path.join(ROOT, ".env"));
loadEnvFile(path.join(ROOT, ".env.local"));

const endpoint = requireEnv("R2_ENDPOINT");
const bucket = requireEnv("R2_PUBLIC_BUCKET");
const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

console.log("[r2-smoke] safe debug", {
  endpoint,
  bucket,
  node: process.version,
  platform: process.platform,
});

const baseConfig = {
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
};

try {
  await runFlow(new S3Client(baseConfig), "default-handler");
  process.exit(0);
} catch (error) {
  if (!isEproto(error)) {
    logFailure("default-handler", error, baseConfig);
    process.exit(1);
  }

  console.warn("[r2-smoke] EPROTO detected, retrying with explicit TLS handler...");
}

const httpsAgent = new https.Agent({
  keepAlive: false,
  minVersion: "TLSv1.2",
});

const fallbackConfig = {
  ...baseConfig,
  requestHandler: new NodeHttpHandler({
    httpsAgent,
  }),
};

try {
  await runFlow(new S3Client(fallbackConfig), "explicit-tls-handler");
  process.exit(0);
} catch (error) {
  logFailure("explicit-tls-handler", error, baseConfig);
  process.exit(1);
}

async function runFlow(client, mode) {
  console.log(`[r2-smoke] ${mode}: PutObject...`);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: TEST_KEY,
      Body: TEST_BODY,
      ContentType: "text/plain",
    }),
  );
  console.log(`[r2-smoke] ${mode}: PutObject success`);

  console.log(`[r2-smoke] ${mode}: HeadObject...`);
  await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: TEST_KEY,
    }),
  );
  console.log(`[r2-smoke] ${mode}: HeadObject success`);

  console.log(`[r2-smoke] ${mode}: DeleteObject...`);
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: TEST_KEY,
    }),
  );
  console.log(`[r2-smoke] ${mode}: DeleteObject success`);
}

function logFailure(mode, error, config) {
  console.error(`[r2-smoke] ${mode}: FAILED`, {
    code: error?.code ?? null,
    name: error?.name ?? null,
    message: error?.message ?? String(error),
  });
  console.error("[r2-smoke] final non-secret config", {
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    bucket,
    region: config.region,
    node: process.version,
    platform: process.platform,
  });
}

function isEproto(error) {
  if (!error || typeof error !== "object") {
    return false;
  }
  return error.code === "EPROTO" || /handshake|tls|ssl/i.test(error.message ?? "");
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return String(value).trim().replace(/^['"]|['"]$/g, "");
}

function loadEnvFile(filePath) {
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
    if (process.env[key] !== undefined) {
      continue;
    }
    const rawValue = match[2];
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}
