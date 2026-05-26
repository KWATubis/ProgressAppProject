import { GarminConnect } from "garmin-connect";

let client: GarminConnect | null = null;
let loginPromise: Promise<GarminConnect> | null = null;

async function login(): Promise<GarminConnect> {
  const email = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("GARMIN_EMAIL / GARMIN_PASSWORD missing in env.");
  }
  const gc = new GarminConnect({ username: email, password });
  await gc.login();
  return gc;
}

export async function getGarminClient(): Promise<GarminConnect> {
  if (client) return client;
  if (!loginPromise) {
    loginPromise = login().catch((err) => {
      loginPromise = null;
      throw err;
    });
  }
  client = await loginPromise;
  return client;
}

export function resetGarminClient(): void {
  client = null;
  loginPromise = null;
}
