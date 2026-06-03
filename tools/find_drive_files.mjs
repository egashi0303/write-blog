import fs from "node:fs/promises";

const [, , ...queries] = process.argv;

if (queries.length === 0) {
  throw new Error("Usage: node find_drive_files.mjs <query> [query...]");
}

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    env[key.trim()] = rest.join("=").trim();
  }
  return env;
}

const env = parseEnv(await fs.readFile("C:/Users/user/write-blog/.env.local", "utf8"));
const required = ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_DRIVE_REFRESH_TOKEN"];
for (const key of required) {
  if (!env[key]) throw new Error(`Missing ${key}`);
}

const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: env.GOOGLE_DRIVE_CLIENT_ID,
    client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
});

if (!tokenResponse.ok) {
  throw new Error(`Token request failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
}

const { access_token: accessToken } = await tokenResponse.json();

for (const query of queries) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  url.searchParams.set("fields", "files(id,name,mimeType,parents,driveId,webViewLink),nextPageToken");
  url.searchParams.set("pageSize", "10");

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  console.log(JSON.stringify({ query, files: data.files ?? [] }, null, 2));
}
