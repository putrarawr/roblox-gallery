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
  
  // Storage settings: 'local', 'supabase', or 'r2' (defaults to supabase for persistent cloud storage)
  storageDriver: (process.env.STORAGE_DRIVER || 'supabase').toLowerCase() as 'local' | 'supabase' | 'r2',
  
  // Local storage paths
  localUploadDir: path.resolve(__dirname, '../uploads'),
  
  // Supabase Storage settings
  supabase: {
    url: process.env.SUPABASE_URL || 'https://qllxgthxeugqqkcsunoa.supabase.co',
    key: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHhndGh4ZXVncXFrY3N1bm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTE2NTc3MywiZXhwIjoyMTA2NzQxNzczfQ.1R1RDnGX1BrlHqiamZFgxtda5U35pcwFpejnR9TSg9U',
    bucket: process.env.SUPABASE_BUCKET || 'screenshots'
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
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'https://roblox-gallery-production.up.railway.app'
};
