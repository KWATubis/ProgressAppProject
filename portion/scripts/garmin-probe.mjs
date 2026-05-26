// Throwaway probe — log into Garmin Connect, fetch today's wellness summary.
// Run: $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node scripts/garmin-probe.mjs
import { GarminConnect } from "garmin-connect";
import { config } from "dotenv";
config({ path: ".env.local" });

const email = process.env.GARMIN_EMAIL;
const password = process.env.GARMIN_PASSWORD;
if (!email || !password) {
  console.error("Missing GARMIN_EMAIL or GARMIN_PASSWORD in .env.local");
  process.exit(1);
}

const gc = new GarminConnect({ username: email, password });
console.log("Logging in as", email, "...");
await gc.login();
console.log("Login OK.");

const today = new Date();
const iso = today.toISOString().slice(0, 10);

console.log("\n--- USER PROFILE ---");
const userInfo = await gc.getUserProfile();
console.log("Display name:", userInfo?.displayName);
console.log("Full name:", userInfo?.fullName);

console.log("\n--- TODAY (" + iso + ") DAILY STEPS / CAL ---");
try {
  const steps = await gc.getSteps(today);
  console.log("Steps:", steps);
} catch (e) {
  console.log("steps err:", e.message);
}

console.log("\n--- HEART RATE (today) ---");
try {
  const hr = await gc.getHeartRate(today);
  console.log("resting:", hr?.restingHeartRate, "min:", hr?.minHeartRate, "max:", hr?.maxHeartRate);
  console.log("sample count:", hr?.heartRateValues?.length ?? 0);
  console.log("first 3 samples:", hr?.heartRateValues?.slice(0, 3));
} catch (e) {
  console.log("hr err:", e.message);
}

console.log("\n--- SLEEP (last night) ---");
try {
  const sleep = await gc.getSleepData(today);
  console.log(JSON.stringify(sleep, null, 2).slice(0, 1200));
} catch (e) {
  console.log("sleep err:", e.message);
}
