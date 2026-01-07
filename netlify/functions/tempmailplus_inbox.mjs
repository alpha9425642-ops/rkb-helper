import TempMail from "temp-mail-plus-api";

export const handler = async (event) => {
  try {
    const email = event.queryStringParameters?.email;
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: "email required" }) };

    const tm = TempMail(email);
    const inbox = await tm.fetchInbox(); // wrapper does the fetching

    // Normalize
    const items = (inbox || []).map(m => ({
      id: m?.id ?? m?.mail_id ?? m?.mailId ?? null,
      from: m?.from ?? "",
      subject: m?.subject ?? "",
      date: m?.date ?? m?.time ?? "",
      // Some wrappers include preview/snippet; otherwise blank
      text: m?.text ?? m?.body ?? m?.preview ?? ""
    }));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
