import * as OTPAuth from "otpauth";

function normalizeSecret(input) {
  if (!input) return "";
  let s = String(input).trim();

  // If user pasted a whole URL or text containing secret=....
  const m = s.match(/secret=([A-Z2-7]+)\b/i);
  if (m?.[1]) s = m[1];

  // Remove spaces and dashes, uppercase
  s = s.replace(/[\s-]/g, "").toUpperCase();

  // Keep only valid base32 chars (A-Z, 2-7)
  s = s.replace(/[^A-Z2-7]/g, "");

  return s;
}

export function makeTotp(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;

  // Full otpauth:// URI
  if (trimmed.startsWith("otpauth://")) {
    try {
      return OTPAuth.URI.parse(trimmed);
    } catch {
      return null;
    }
  }

  // Base32 secret
  const secretB32 = normalizeSecret(trimmed);
  if (!secretB32) return null;

  try {
    return new OTPAuth.TOTP({
      issuer: "RKB Helper",
      label: "2FA",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromB32(secretB32),
    });
  } catch {
    return null;
  }
}

export function totpNow(totp) {
  const token = totp.generate();
  const epoch = Math.floor(Date.now() / 1000);
  const period = totp.period || 30;
  const left = period - (epoch % period);
  return { token, left };
}
