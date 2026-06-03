import fs from "node:fs/promises";
import path from "node:path";

const [, , sourceInput, parentFolderId, folderName, fileName, outputRootArg] = process.argv;

if (!sourceInput || !parentFolderId || !folderName || !fileName) {
  throw new Error(
    "Usage: node download_and_upload_image_to_drive.mjs <sourceUrlOrPath> <parentFolderId> <folderName> <fileName> [outputRoot]",
  );
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

function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function inferExtension(contentType, urlValue) {
  const cleanUrl = urlValue.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".png")) return ".png";
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return ".jpg";
  if (cleanUrl.endsWith(".webp")) return ".webp";
  if (cleanUrl.endsWith(".gif")) return ".gif";
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("jpeg")) return ".jpg";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  return ".png";
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
const outputRoot = outputRootArg ?? "C:/Users/user/write-blog/outputs/thumbnail_downloads";
const safeFolderName = sanitizeFileName(folderName);
const safeFileName = sanitizeFileName(fileName);
const localFolder = path.join(outputRoot, safeFolderName);
await fs.mkdir(localFolder, { recursive: true });

let bytes;
let contentType = "application/octet-stream";
let extension = ".png";

if (await isReadableLocalFile(sourceInput)) {
  const resolvedPath = path.resolve(sourceInput);
  bytes = await fs.readFile(resolvedPath);
  extension = path.extname(resolvedPath) || ".png";
  contentType = mimeTypeFromExtension(extension);
} else {
  const downloadResponse = await fetch(sourceInput);
  if (!downloadResponse.ok) {
    throw new Error(`Download request failed: ${downloadResponse.status} ${await downloadResponse.text()}`);
  }

  contentType = downloadResponse.headers.get("content-type") ?? "";
  extension = inferExtension(contentType, sourceInput);
  bytes = Buffer.from(await downloadResponse.arrayBuffer());
}

const localFilePath = path.join(localFolder, `${safeFileName}${extension}`);
await fs.writeFile(localFilePath, bytes);

const driveFolder = await findOrCreateFolder(accessToken, parentFolderId, safeFolderName);
const uploaded = await uploadBinaryFile(
  accessToken,
  driveFolder.id,
  `${safeFileName}${extension}`,
  bytes,
  contentType || "application/octet-stream",
);

console.log(
  JSON.stringify(
    {
      sourceInput,
      localFilePath,
      localFileSize: bytes.length,
      driveFolder,
      uploaded,
    },
    null,
    2,
  ),
);

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
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set(
    "q",
    [
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${escapeQueryValue(name)}'`,
      `'${parentFolderId}' in parents`,
      "trashed = false",
    ].join(" and "),
  );
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
  return data.files?.[0] ?? null;
}

async function uploadBinaryFile(accessToken, parentFolderId, fileName, content, mimeType) {
  const boundary = `codex_boundary_${Date.now()}`;
  const metadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const multipartPrefix =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const multipartSuffix = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(multipartPrefix, "utf8"),
    content,
    Buffer.from(multipartSuffix, "utf8"),
  ]);

  const uploadUrl =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,parents,webViewLink";
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

async function isReadableLocalFile(input) {
  if (!input) return false;
  if (/^https?:\/\//i.test(input)) return false;
  try {
    const stat = await fs.stat(path.resolve(input));
    return stat.isFile();
  } catch {
    return false;
  }
}

function mimeTypeFromExtension(extension) {
  switch ((extension || "").toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".png":
    default:
      return "image/png";
  }
}
