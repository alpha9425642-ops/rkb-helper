// netlify/functions/tempmailplus_inbox.mjs

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const email = (qs.email || "").trim(); // MUST include @domain
    const epin = (qs.epin || "").trim();   // usually blank
    const limit = Number(qs.limit || 20);

    if (!email || !email.includes("@")) {
      return json(400, { error: "Missing or invalid email (must include @domain)" });
    }

    // 1) List mails
    const listUrl =
      `https://tempmail.plus/api/mails?email=${encodeURIComponent(email)}` +
      `&limit=${encodeURIComponent(String(limit))}` +
      `&epin=${encodeURIComponent(epin)}`;

    const listRes = await fetch(listUrl, {
      headers: {
        "accept": "application/json, text/plain, */*",
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!listRes.ok) {
      const t = await safeText(listRes);
      return json(502, { error: "TempMail+ list failed", status: listRes.status, details: t });
    }

    const listData = await listRes.json();

    // Expected shape (commonly):
    // { result: true, mail_list: [ { mail_id, from_mail, from_name, subject, time, ... } ], ... }
    const ok = listData?.result === true;
    const mailList = Array.isArray(listData?.mail_list) ? listData.mail_list : [];

    if (!ok) {
      return json(200, { items: [] });
    }

    // 2) Fetch message bodies (only newest few to keep it fast)
    const newest = mailList.slice(0, 10);

    const items = await Promise.all(
      newest.map(async (m) => {
        const mailId = m?.mail_id ?? m?.id;
        const from = m?.from_mail || m?.from || "";
        const subject = m?.subject || "";
        const time = m?.time || "";

        let text = "";
        if (mailId != null) {
          const msgUrl =
            `https://tempmail.plus/api/mails/${encodeURIComponent(String(mailId))}` +
            `?email=${encodeURIComponent(email)}` +
            `&epin=${encodeURIComponent(epin)}`;

          const msgRes = await fetch(msgUrl, {
            headers: {
              "accept": "application/json, text/plain, */*",
              "user-agent": "Mozilla/5.0",
            },
          });

          if (msgRes.ok) {
            const msgData = await msgRes.json();
            // Common fields: text, subject, from_mail, time, html (varies)
            text = (msgData?.text || msgData?.body || msgData?.mail_text || "").toString();
          }
        }

        return {
          id: String(mailId ?? ""),
          from,
          subject,
          text,
          time,
        };
      })
    );

    return json(200, { items });
  } catch (err) {
    return json(500, { error: "Server error", message: String(err?.message || err) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
    },
    body: JSON.stringify(obj),
  };
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
