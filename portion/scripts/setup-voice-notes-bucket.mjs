// Idempotent: creates the private "voice-notes" Storage bucket if it doesn't
// exist. Run once after deploying Phase 2:
//   node scripts/setup-voice-notes-bucket.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "voice-notes";

const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
if (listErr) {
  console.error("Failed to list buckets:", listErr.message);
  process.exit(1);
}

if (buckets.some((b) => b.name === BUCKET)) {
  console.log(`Bucket "${BUCKET}" already exists — nothing to do.`);
  process.exit(0);
}

const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
  public: false,
  fileSizeLimit: 5 * 1024 * 1024, // 5 MB — a 60s webm/opus note is ~0.5 MB
  allowedMimeTypes: ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"],
});
if (createErr) {
  console.error("Failed to create bucket:", createErr.message);
  process.exit(1);
}
console.log(`Created private bucket "${BUCKET}".`);
