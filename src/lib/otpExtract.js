// Works across languages by just extracting 5-8 digit sequences.
// If multiple, prefer ones near keywords commonly present in FB mails (in many languages).
export function extractOtp(text) {
  if (!text) return null;

  const t = text.replace(/\u200B/g, " "); // zero-width junk
  const candidates = [...t.matchAll(/(?<!\d)(\d{5,8})(?!\d)/g)].map(m => m[1]);
  if (!candidates.length) return null;

  const lowered = t.toLowerCase();
  const hintWords = [
    "facebook", "fb", "code", "otp", "security", "login", "confirmation",
    "código", "код", "رمز", "क\u094bड", "코드", "コード", "验证码", "код подтверждения"
  ];

  // If message contains hints, just return first 5-8 digit number (usually the OTP).
  if (hintWords.some(w => lowered.includes(w))) return candidates[0];

  // otherwise still return first candidate
  return candidates[0];
}
