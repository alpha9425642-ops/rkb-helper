// Pure TOTP (no dependencies). Works in browsers over HTTPS (Netlify).
// Exports: parseTotpConfig, totpGenerate

function normalizeBase32(s) {
  return (s || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[^A-Z2-7]/g, "");
}

function base32ToBytes(b32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const out = [];

  for (const ch of b32) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function parseOtpAuth(input) {
  const raw = (input || "").trim();
  if (!raw.startsWith("otpauth://")) return null;

  const u = new URL(raw.replace("otpauth://", "https://otpauth/"));
  const secret = u.searchParams.get("secret") || "";
  const digits = parseInt(u.searchParams.get("digits") || "6", 10);
  const period = parseInt(u.searchParams.get("period") || "30", 10);
  const algorithm = (u.searchParams.get("algorithm") || "SHA1").toUpperCase();

  return {
    secret,
    digits: Number.isFinite(digits) ? digits : 6,
    period: Number.isFinite(period) ? period : 30,
    algorithm: ["SHA1", "SHA256", "SHA512"].includes(algorithm) ? algorithm : "SHA1",
  };
}

async function hmac(algorithm, keyBytes, msgBytes) {
  const algoMap = {
    SHA1: "SHA-1",
    SHA256: "SHA-256",
    SHA512: "SHA-512",
  };

  const hashName = algoMap[algorithm] || "SHA-1";

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: { name: hashName } },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
  return new Uint8Array(sig);
}


function intToBytes(counter) {
  const b = new Uint8Array(8);
  let x = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    b[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return b;
}

function dynamicTruncate(hmacBytes) {
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const p =
    ((hmacBytes[offset] & 0x7f) << 24) |
    (hmacBytes[offset + 1] << 16) |
    (hmacBytes[offset + 2] << 8) |
    (hmacBytes[offset + 3] << 0);
  return p >>> 0;
}

export function parseTotpConfig(input) {
  const raw = (input || "").trim();
  if (!raw) return null;

  const uriCfg = parseOtpAuth(raw);
  if (uriCfg) return uriCfg;

  const b32 = normalizeBase32(raw);
  if (!b32) return null;

  return { secret: b32, digits: 6, period: 30, algorithm: "SHA1" };
}

export async function totpGenerate(cfg) {
  const secretB32 = normalizeBase32(cfg?.secret);
  if (!secretB32) return null;

  const keyBytes = base32ToBytes(secretB32);
  if (!keyBytes.length) return null;

  const epoch = Math.floor(Date.now() / 1000);
  const period = cfg.period || 30;
  const counter = Math.floor(epoch / period);

  const msg = intToBytes(counter);
  const mac = await hmac(cfg.algorithm || "SHA1", keyBytes, msg);
  const codeInt = dynamicTruncate(mac) % (10 ** (cfg.digits || 6));
  const token = String(codeInt).padStart(cfg.digits || 6, "0");
  const left = period - (epoch % period);

  return { token, left };
}
