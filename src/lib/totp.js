import * as OTPAuth from "otpauth";

export function makeTotp(secret) {
  const trimmed = (secret || "").trim();
  if (!trimmed) return null;

  let totp;

  if (trimmed.startsWith("otpauth://")) {
    totp = OTPAuth.URI.parse(trimmed);
  } else {
    totp = new OTPAuth.TOTP({
      issuer: "RKB Helper",
      label: "2FA",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromB32(trimmed.replace(/\s+/g, ""))
    });
  }

  return totp;
}

export function totpNow(totp) {
  const token = totp.generate();
  const epoch = Math.floor(Date.now() / 1000);
  const period = totp.period || 30;
  const left = period - (epoch % period);
  return { token, left };
}
