import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

let s3Client: S3Client | null = null;
let supabaseClient: SupabaseClient | null = null;

if (config.storageDriver === 'supabase') {
  if (!config.supabase.url || !config.supabase.key) {
    console.warn('[STORAGE] Supabase credentials incomplete in .env. Falling back to local storage.');
  } else {
    supabaseClient = createClient(config.supabase.url, config.supabase.key);
    console.log(`[STORAGE] Configured Supabase Storage bucket: ${config.supabase.bucket}`);
    
    // Ensure bucket is public for gallery access
    supabaseClient.storage.getBucket(config.supabase.bucket).then(({ data: b }) => {
      if (b && !b.public) {
        supabaseClient?.storage.updateBucket(config.supabase.bucket, { public: true }).then(() => {
          console.log(`[STORAGE] Supabase bucket '${config.supabase.bucket}' set to public.`);
        });
      }
    }).catch(() => {});
  }
} else if (config.storageDriver === 'r2') {
  if (!config.r2.accountId || !config.r2.accessKeyId || !config.r2.secretAccessKey || !config.r2.bucketName) {
    console.warn('[STORAGE] Cloudflare R2 credentials incomplete in .env. Falling back to local storage.');
  } else {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey
      }
    });
    console.log(`[STORAGE] Configured Cloudflare R2 bucket: ${config.r2.bucketName}`);
  }
}

export interface UploadResult {
  imageUrl: string;
  storageKey: string;
}

export const storageService = {
  async saveFile(fileBuffer: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    // 1. Supabase Storage Driver
    if (supabaseClient && config.storageDriver === 'supabase') {
      const key = `roblox-sync/${filename}`;
      const { error } = await supabaseClient.storage
        .from(config.supabase.bucket)
        .upload(key, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        console.error('[STORAGE] Supabase upload error:', error);
        throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
      }

      const { data: publicData } = supabaseClient.storage
        .from(config.supabase.bucket)
        .getPublicUrl(key);

      return {
        imageUrl: publicData.publicUrl,
        storageKey: key
      };
    }

    // 2. Cloudflare R2 Driver
    if (s3Client && config.storageDriver === 'r2') {
      const key = `roblox-sync/${filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.r2.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable'
        })
      );

      const publicBase = config.r2.publicUrl || `https://${config.r2.bucketName}.${config.r2.accountId}.r2.cloudflarestorage.com`;
      const imageUrl = `${publicBase}/${key}`;

      return {
        imageUrl,
        storageKey: key
      };
    }

    // 3. Local Filesystem Driver (Default)
    const filePath = path.join(config.localUploadDir, filename);
    await fs.writeFile(filePath, fileBuffer);

    const imageUrl = `/uploads/${filename}`;
    return {
      imageUrl,
      storageKey: filename
    };
  },

  async deleteFile(storageKey: string): Promise<void> {
    try {
      if (supabaseClient && config.storageDriver === 'supabase') {
        await supabaseClient.storage
          .from(config.supabase.bucket)
          .remove([storageKey]);
      } else if (s3Client && config.storageDriver === 'r2') {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: config.r2.bucketName,
            Key: storageKey
          })
        );
      } else {
        const filePath = path.join(config.localUploadDir, storageKey);
        await fs.unlink(filePath).catch(() => {});
      }
    } catch (err) {
      console.error(`[STORAGE] Failed to delete file ${storageKey}:`, err);
    }
  }
};
