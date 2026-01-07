// netlify/functions/tempmailplus_new.mjs

export const handler = async () => {
  // TempMail+ supports many domains; these are common ones people use.
  const domains = [
    "rover.info",
    "mailto.in.ua",
    "mailbox.in.ua",
    "fextemp.com",
  ];

  const domain = domains[Math.floor(Math.random() * domains.length)];

  // random user
  const rand = Math.random().toString(36).slice(2, 10);
  const email = `rkb${Date.now().toString().slice(-6)}${rand}@${domain}`;

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify({ email }),
  };
};
