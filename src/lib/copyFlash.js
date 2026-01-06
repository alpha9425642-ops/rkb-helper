export async function copyWithFlash(text, flashKey, setFlashKey) {
  try {
    await navigator.clipboard.writeText(text);
    setFlashKey(flashKey);
    setTimeout(() => setFlashKey(null), 500);
    return true;
  } catch {
    return false;
  }
}
