import * as mod from "temp-mail-plus-api";

function resolveCtor() {
  // Handles: default export, named export, or nested default
  const d = mod?.default;
  return (
    d?.default || // sometimes transpiled modules nest default
    d ||          // normal default export
    mod?.TempMail || // named export
    mod            // fallback (rare)
  );
}

function makeClient(email) {
  const Ctor = resolveCtor();

  // try as constructor
  try {
    return new Ctor(email);
  } catch {}

  // try as function returning an object
  try {
    return Ctor(email);
  } catch {}

  // try nested TempMail
  try {
    if (Ctor?.TempMail) return new Ctor.TempMail(email);
  } catch {}

  return null;
}

function pickFn(obj, names) {
  for (const n of names) {
    if (obj && typeof obj[n] === "function") return obj[n].bind(obj);
  }
  return null;
}

export const handler = async (event) => {
  try {
    const email = (event.queryStringParameters?.email || "").trim();
    if (!email) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing email" }),
      };
    }

    const client = makeClient(email);
    if (!client) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error:
            "TempMail client could not be created (library export mismatch).",
          debug: {
            moduleKeys: Object.keys(mod || {}),
            defaultKeys: Object.keys(mod?.default || {}),
          },
        }),
      };
    }

    // Find inbox/list method across versions
    const listInbox =
      pickFn(client, [
        "getInbox",
        "inbox",
        "getMails",
        "mails",
        "getMessages",
        "messages",
        "getMailList",
      ]) ||
      pickFn(mod, ["getInbox", "getMails", "getMessages"]) ||
      pickFn(mod?.default, ["getInbox", "getMails", "getMessages"]);

    if (!listInbox) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "No inbox method found on temp-mail-plus-api client.",
          debug: { clientKeys: Object.keys(client || {}) },
        }),
      };
    }

    const raw = await listInbox();
    const mails = Array.isArray(raw) ? raw : raw?.mails || raw?.messages || [];

    // Normalize shape for your frontend
    const normalized = mails.map((m) => ({
      id: m?.id ?? m?.mail_id ?? m?._id ?? m?.messageId ?? m?.uuid ?? "",
      from: m?.from ?? m?.sender ?? "",
      subject: m?.subject ?? m?.title ?? "",
      date: m?.date ?? m?.time ?? m?.created_at ?? "",
      text: m?.text ?? m?.body_text ?? m?.body ?? "",
      html: m?.html ?? m?.body_html ?? "",
    }));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, mails: normalized }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: String(e?.message || e),
      }),
    };
  }
};
