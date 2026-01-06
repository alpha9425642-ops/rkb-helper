export const handler = async () => {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      supported: false,
      message:
        "Mail.cx does not expose a stable public inbox API. This tab is a stub. Use TempMail+ or replace this function with a working Mail.cx adapter."
    })
  };
};
