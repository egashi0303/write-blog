import fs from "node:fs/promises";

const [, , sourcePath, folderId, title] = process.argv;

if (!sourcePath || !folderId || !title) {
  throw new Error("Usage: node upload_xlsx_to_drive_folder.mjs <sourcePath> <folderId> <title>");
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
const bytes = await fs.readFile(sourcePath);
const folderName = title;
const folder = await findOrCreateFolder(accessToken, folderId, folderName);
const existingSpreadsheet = await findExistingSpreadsheet(accessToken, folder.id, title);

if (existingSpreadsheet) {
  console.log(JSON.stringify({ folder, spreadsheet: existingSpreadsheet, reusedExistingSpreadsheet: true }));
  process.exit(0);
}

const uploaded = await uploadSpreadsheet(accessToken, folder.id, title, bytes);
console.log(JSON.stringify({ folder, spreadsheet: uploaded, reusedExistingSpreadsheet: false }));

async function findOrCreateFolder(accessToken, parentFolderId, name) {
  const existing = await findFolderByName(accessToken, parentFolderId, name);
  if (existing) return existing;

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType,parents,webViewLink",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Folder create request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function findFolderByName(accessToken, parentFolderId, name) {
  const response = await searchDriveFiles(accessToken, [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeQueryValue(name)}'`,
    `'${parentFolderId}' in parents`,
    "trashed = false",
  ]);

  return response.files?.[0] ?? null;
}

async function findExistingSpreadsheet(accessToken, parentFolderId, name) {
  const response = await searchDriveFiles(accessToken, [
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    `name = '${escapeQueryValue(name)}'`,
    `'${parentFolderId}' in parents`,
    "trashed = false",
  ]);

  return response.files?.[0] ?? null;
}

async function searchDriveFiles(accessToken, clauses) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", clauses.join(" and "));
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

  return response.json();
}

async function uploadSpreadsheet(accessToken, parentFolderId, spreadsheetName, content) {
  const boundary = `codex_boundary_${Date.now()}`;
  const metadata = {
    name: spreadsheetName,
    mimeType: "application/vnd.google-apps.spreadsheet",
    parents: [parentFolderId],
  };

  const multipartPrefix =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n";
  const multipartSuffix = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(multipartPrefix, "utf8"),
    content,
    Buffer.from(multipartSuffix, "utf8"),
  ]);

  const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,parents,webViewLink";
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    body,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload request failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
  }

  return uploadResponse.json();
}

function escapeQueryValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
