import fs from "node:fs/promises";

const [, , fileId, folderId] = process.argv;

if (!fileId || !folderId) {
  throw new Error("Usage: node move_drive_file_to_folder.mjs <fileId> <folderId>");
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

const metadataResponse = await fetch(
  `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,parents,mimeType`,
  { headers: { authorization: `Bearer ${accessToken}` } },
);

if (!metadataResponse.ok) {
  throw new Error(`Metadata request failed: ${metadataResponse.status} ${await metadataResponse.text()}`);
}

const metadata = await metadataResponse.json();
const parents = metadata.parents ?? [];
const removeParents = parents.filter((parent) => parent !== folderId).join(",");

const moveUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
moveUrl.searchParams.set("addParents", folderId);
moveUrl.searchParams.set("fields", "id,name,parents");
moveUrl.searchParams.set("supportsAllDrives", "true");
if (removeParents) moveUrl.searchParams.set("removeParents", removeParents);

const moveResponse = await fetch(moveUrl, {
  method: "PATCH",
  headers: {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({}),
});

if (!moveResponse.ok) {
  throw new Error(`Move request failed: ${moveResponse.status} ${await moveResponse.text()}`);
}

const moved = await moveResponse.json();
console.log(JSON.stringify({ id: moved.id, name: moved.name, parents: moved.parents }));
