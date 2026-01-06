async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function copyWithFlash(text, key, setFlashKey) {
  if (!text) return false;
  const ok = await writeClipboard(text);

  // emit ONE unique event, never "clear" it later
  setFlashKey({ key, ts: Date.now() });

  return ok;
}
