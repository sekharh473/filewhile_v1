import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const LOCAL_UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

// -------------------------------------------------------------
// 1. Supabase Storage Detection
// -------------------------------------------------------------
const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SECRET_KEY
);

let supabaseClient = null;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_NAME || 'filewhile';

if (isSupabaseConfigured) {
  supabaseClient = createClient(
    process.env.SUPABASE_URL.trim(),
    process.env.SUPABASE_SECRET_KEY.trim()
  );

  // Auto-verify bucket existence
  supabaseClient.storage.getBucket(SUPABASE_BUCKET).then(({ data, error }) => {
    if (error && error.message?.includes('not found')) {
      supabaseClient.storage.createBucket(SUPABASE_BUCKET, { public: false })
        .then(() => console.log(`[Storage] Auto-created private bucket "${SUPABASE_BUCKET}" on Supabase`))
        .catch(err => console.error('[Storage] Error creating Supabase bucket:', err.message));
    } else {
      console.log(`[Storage] Connected to Supabase Storage bucket: "${SUPABASE_BUCKET}"`);
    }
  }).catch(err => console.error('[Storage] Supabase bucket check error:', err.message));
}

// -------------------------------------------------------------
// 2. Backblaze B2 / S3 Storage Detection (Fallback cloud option)
// -------------------------------------------------------------
const isB2Configured = !isSupabaseConfigured && Boolean(
  process.env.B2_APPLICATION_KEY_ID &&
  process.env.B2_APPLICATION_KEY &&
  process.env.B2_BUCKET_NAME &&
  process.env.B2_ENDPOINT
);

let s3Client = null;
if (isB2Configured) {
  let endpoint = process.env.B2_ENDPOINT.trim();
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }
  const regionMatch = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  const region = regionMatch ? regionMatch[1] : 'us-east-005';

  s3Client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: process.env.B2_APPLICATION_KEY_ID,
      secretAccessKey: process.env.B2_APPLICATION_KEY
    },
    forcePathStyle: true
  });
  console.log(`[Storage] Connected to Backblaze B2 bucket: ${process.env.B2_BUCKET_NAME}`);
}

if (!isSupabaseConfigured && !isB2Configured) {
  console.log('[Storage] Running with local ephemeral disk storage in backend/uploads/');
}

export function isCloudStorageEnabled() {
  return isSupabaseConfigured || isB2Configured;
}

export function getStorageProviderName() {
  if (isSupabaseConfigured) return 'Supabase Storage';
  if (isB2Configured) return 'Backblaze B2';
  return 'Local Disk Ephemeral';
}

/**
 * Save an uploaded file to Supabase, S3, or Local Disk
 */
export async function saveFile(roomId, file) {
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueKey = `${Date.now()}-${sanitizedName}`;
  const storagePathKey = `${roomId}/${uniqueKey}`;

  // Supabase Storage
  if (isSupabaseConfigured && supabaseClient) {
    const { error: uploadError } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePathKey, file.buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    return {
      storageKey: storagePathKey,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString(),
      provider: 'supabase'
    };
  }

  // Backblaze S3 Storage
  if (isB2Configured && s3Client) {
    const uploadParams = {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: storagePathKey,
      Body: file.buffer,
      ContentType: file.mimetype
    };
    await s3Client.send(new PutObjectCommand(uploadParams));

    return {
      storageKey: storagePathKey,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString(),
      provider: 'b2'
    };
  }

  // Local Ephemeral Disk Storage
  const roomDir = path.join(LOCAL_UPLOADS_DIR, roomId);
  if (!fs.existsSync(roomDir)) {
    fs.mkdirSync(roomDir, { recursive: true });
  }

  const localFilePath = path.join(roomDir, uniqueKey);
  await fs.promises.writeFile(localFilePath, file.buffer);

  return {
    storageKey: uniqueKey,
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date().toISOString(),
    provider: 'local'
  };
}

/**
 * Get readable stream for downloading or streaming
 */
export async function getFileStream(roomId, storageKey) {
  // Supabase
  if (isSupabaseConfigured && supabaseClient) {
    const pathKey = storageKey.includes('/') ? storageKey : `${roomId}/${storageKey}`;
    const { data, error } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .download(pathKey);

    if (error || !data) {
      throw new Error(`Supabase download failed: ${error?.message || 'File not found'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      stream: Readable.from(buffer),
      contentType: data.type || 'application/octet-stream',
      contentLength: buffer.length
    };
  }

  // S3 / B2
  if (isB2Configured && s3Client) {
    const key = storageKey.includes('/') ? storageKey : `${roomId}/${storageKey}`;
    const getCommand = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key
    });
    const response = await s3Client.send(getCommand);
    return {
      stream: response.Body,
      contentType: response.ContentType,
      contentLength: response.ContentLength
    };
  }

  // Local Disk
  const localFilePath = path.join(LOCAL_UPLOADS_DIR, roomId, storageKey);
  if (!fs.existsSync(localFilePath)) {
    throw new Error('File not found on local disk');
  }
  const stat = await fs.promises.stat(localFilePath);
  return {
    stream: fs.createReadStream(localFilePath),
    contentType: 'application/octet-stream',
    contentLength: stat.size
  };
}

/**
 * Delete a single file
 */
export async function deleteFile(roomId, storageKey) {
  if (isSupabaseConfigured && supabaseClient) {
    const pathKey = storageKey.includes('/') ? storageKey : `${roomId}/${storageKey}`;
    await supabaseClient.storage.from(SUPABASE_BUCKET).remove([pathKey]);
    return;
  }

  if (isB2Configured && s3Client) {
    const key = storageKey.includes('/') ? storageKey : `${roomId}/${storageKey}`;
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key
    }));
    return;
  }

  const localFilePath = path.join(LOCAL_UPLOADS_DIR, roomId, storageKey);
  if (fs.existsSync(localFilePath)) {
    await fs.promises.unlink(localFilePath);
  }
}

/**
 * Clean up all files belonging to a room (called on 2-hour TTL purge)
 */
export async function deleteRoomFiles(roomId, fileKeys = []) {
  try {
    // Clean Supabase files
    if (isSupabaseConfigured && supabaseClient) {
      const keysToDelete = fileKeys.map(k => (k.includes('/') ? k : `${roomId}/${k}`));
      if (keysToDelete.length > 0) {
        await supabaseClient.storage.from(SUPABASE_BUCKET).remove(keysToDelete);
      }
      // Also list and wipe any orphaned files under roomId folder
      const { data: folderItems } = await supabaseClient.storage.from(SUPABASE_BUCKET).list(roomId);
      if (folderItems && folderItems.length > 0) {
        await supabaseClient.storage.from(SUPABASE_BUCKET).remove(
          folderItems.map(item => `${roomId}/${item.name}`)
        );
      }
      console.log(`[Storage] Purged room "${roomId}" files from Supabase`);
    }

    // Clean S3 files
    if (isB2Configured && s3Client && fileKeys.length > 0) {
      const objects = fileKeys.map(k => ({
        Key: k.includes('/') ? k : `${roomId}/${k}`
      }));
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: process.env.B2_BUCKET_NAME,
        Delete: { Objects: objects }
      }));
    }

    // Always clean local room directory if it exists
    const roomDir = path.join(LOCAL_UPLOADS_DIR, roomId);
    if (fs.existsSync(roomDir)) {
      await fs.promises.rm(roomDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[Storage] Error cleaning room ${roomId}:`, err.message);
  }
}
