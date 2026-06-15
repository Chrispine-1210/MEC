import "dotenv/config";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.split("=");
    return [key, valueParts.length > 0 ? valueParts.join("=") : "true"];
  }),
);

const hasFlag = (name) => args.has(name) || process.env[name.replace(/^--/, "").replaceAll("-", "_").toUpperCase()] === "true";
const getOption = (name, envName, fallback) => args.get(name) || process.env[envName] || fallback;

const domain = getOption("--domain", "RESEND_DOMAIN", "notifications.mtendereeducationconsult.com");
const region = getOption("--region", "RESEND_REGION", "us-east-1");
const applyCloudflare = hasFlag("--apply-cloudflare");
const verifyAfterDns = hasFlag("--verify");
const resendApiKey = process.env.RESEND_API_KEY;
const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
const cloudflareZoneId = process.env.CLOUDFLARE_ZONE_ID;

const fail = (message, details) => {
  const error = new Error(message);
  Object.assign(error, { details, expected: true });
  throw error;
};

if (!resendApiKey || !resendApiKey.startsWith("re_")) {
  fail("RESEND_API_KEY is required and must look like a Resend API key.");
}

const resendRequest = async (method, path, body) => {
  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Resend ${method} ${path} failed with HTTP ${response.status}`;
    const error = new Error(message);
    Object.assign(error, { status: response.status, payload });
    throw error;
  }

  return payload;
};

const listDomains = async () => {
  const payload = await resendRequest("GET", "/domains");
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.domains)
        ? payload.domains
        : [];
  return candidates;
};

const createOrGetDomain = async () => {
  try {
    return await resendRequest("POST", "/domains", {
      name: domain,
      region,
      capabilities: {
        sending: "enabled",
        receiving: "disabled",
      },
    });
  } catch (error) {
    if (error?.status === 401 && String(error.message).includes("restricted")) {
      fail(
        "The current RESEND_API_KEY is send-only. Create a full-access Resend API key, then rerun this script.",
        error.payload,
      );
    }

    const message = String(error?.message || "");
    if (error?.status === 409 || /already exists/i.test(message)) {
      const existing = (await listDomains()).find((item) => item?.name === domain);
      if (existing) return existing;
    }

    throw error;
  }
};

const resolveRecordName = (recordName) => {
  const trimmed = String(recordName || "").trim().replace(/\.$/, "");
  if (!trimmed || trimmed === "@") return domain;
  if (trimmed === domain || trimmed.endsWith(`.${domain}`)) return trimmed;
  return `${trimmed}.${domain}`;
};

const cleanDnsContent = (type, value) => {
  const trimmed = String(value || "").trim();
  if (type === "TXT" && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\.$/, "");
};

const normalizeDnsRecord = (record) => {
  const type = String(record.type || "").toUpperCase();
  const normalized = {
    type,
    name: resolveRecordName(record.name),
    content: cleanDnsContent(type, record.value),
    proxied: false,
    ttl: 1,
  };
  if (type === "MX" && record.priority !== undefined && record.priority !== null) {
    normalized.priority = Number(record.priority);
  }
  return normalized;
};

const cloudflareRequest = async (method, path, body) => {
  if (!cloudflareToken || !cloudflareZoneId) {
    fail("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are required when using --apply-cloudflare.");
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cloudflareToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(
      `Cloudflare ${method} ${path} failed: ${
        payload?.errors?.map((item) => item.message).join("; ") || response.statusText
      }`,
    );
  }
  return payload;
};

const findCloudflareRecords = async (name, type) => {
  const params = new URLSearchParams({ name });
  if (type) params.set("type", type);
  const payload = await cloudflareRequest("GET", `/dns_records?${params.toString()}`);
  return Array.isArray(payload.result) ? payload.result : [];
};

const upsertCloudflareRecord = async (record) => {
  if (record.type === "CNAME") {
    const sameName = await findCloudflareRecords(record.name);
    for (const conflict of sameName.filter((item) => item.type !== "CNAME")) {
      await cloudflareRequest("DELETE", `/dns_records/${conflict.id}`);
    }
  }

  const existing = (await findCloudflareRecords(record.name, record.type))[0];
  const body = { ...record };
  if (existing) {
    await cloudflareRequest("PATCH", `/dns_records/${existing.id}`, body);
    return "updated";
  }
  await cloudflareRequest("POST", "/dns_records", body);
  return "created";
};

const main = async () => {
  const domainRecord = await createOrGetDomain();
  const records = Array.isArray(domainRecord.records) ? domainRecord.records.map(normalizeDnsRecord) : [];

  console.log(
    JSON.stringify(
      {
        ok: true,
        domain: domainRecord.name || domain,
        domainId: domainRecord.id,
        status: domainRecord.status,
        region: domainRecord.region || region,
        records,
      },
      null,
      2,
    ),
  );

  if (applyCloudflare) {
    const results = [];
    for (const record of records) {
      results.push({ ...record, action: await upsertCloudflareRecord(record) });
    }
    console.log(JSON.stringify({ ok: true, cloudflare: results }, null, 2));
  }

  if (verifyAfterDns) {
    if (!domainRecord.id) fail("Resend domain id is required before verification.");
    const verification = await resendRequest("POST", `/domains/${domainRecord.id}/verify`);
    console.log(JSON.stringify({ ok: true, verification }, null, 2));
  }
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Resend domain configuration failed.",
        details: error?.details || error?.payload || null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
