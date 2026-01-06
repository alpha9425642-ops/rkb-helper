import TempMail, { TEMP_MAIL_DOMAINS } from "temp-mail-plus-api";

export const handler = async () => {
  try {
    const domain = TEMP_MAIL_DOMAINS[Math.floor(Math.random() * TEMP_MAIL_DOMAINS.length)];
    const user = `rkb${Math.floor(Math.random() * 1e9)}`; // random
    const email = `${user}@${domain}`;

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
