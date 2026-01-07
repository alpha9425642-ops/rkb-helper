import * as mod from "temp-mail-plus-api";

function domainsFromModule() {
  return (
    mod?.TEMP_MAIL_DOMAINS ||
    mod?.default?.TEMP_MAIL_DOMAINS ||
    mod?.default?.default?.TEMP_MAIL_DOMAINS ||
    []
  );
}

function rand(n = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const handler = async () => {
  try {
    const domains = domainsFromModule();
    const domain = domains.length ? domains[Math.floor(Math.random() * domains.length)] : "rover.info";
    const email = `rkb${Date.now()}${rand(4)}@${domain}`;

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, email, domain }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(e?.message || e) }),
    };
  }
};
