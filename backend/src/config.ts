import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  daemonSecret: process.env.DAEMON_SECRET || 'roblox-sync-gallery-secret-token',
  
  // Storage settings: 'local', 'supabase', or 'r2'
  storageDriver: (process.env.STORAGE_DRIVER || 'local').toLowerCase() as 'local' | 'supabase' | 'r2',
  
  // Local storage paths
  localUploadDir: path.resolve(__dirname, '../uploads'),
  
  // Supabase Storage settings
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_BUCKET || 'roblox-gallery'
  },

  // Cloudflare R2 / S3 settings
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
  },
  
  // Database file path
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../data/gallery.db'),

  // Public URL for local backend (for image URLs)
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:4000'
};
