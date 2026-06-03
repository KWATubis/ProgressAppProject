// Read-only: lists all Supabase auth users so we can confirm which test
// accounts to delete. Does NOT modify anything.
//
// Run from portion/:  node scripts/list-auth-users.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Minimal .env.local parser (avoids a dotenv dependency).
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SEED = env.SEED_USER_ID;
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (error) {
  console.error("Failed to list users:", error.message);
  process.exit(1);
}

console.log(`\nFound ${data.users.length} auth user(s):\n`);
for (const u of data.users) {
  const tag = u.id === SEED ? "  <-- MAIN ACCOUNT (keep)" : "";
  console.log(`  ${u.email ?? "(no email)"}`);
  console.log(`    id:        ${u.id}`);
  console.log(`    created:   ${u.created_at}`);
  console.log(`    last sign: ${u.last_sign_in_at ?? "never"}${tag}`);
  console.log("");
}
