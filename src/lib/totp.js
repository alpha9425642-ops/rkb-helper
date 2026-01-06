import * as OTPAuth from "otpauth";

export function makeTotp(input) {
  const s = (input || "").trim();
  if (!s) return null;

  try {
    // Accept full otpauth:// URIs
    if (s.startsWith("otpauth://")) {
      return OTPAuth.URI.parse(s);
    }

    // Accept base32 secrets (remove spaces/dashes, uppercase)
    const b32 = s.replace(/[\s-]/g, "").toUpperCase();

    return new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromB32(b32),
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
