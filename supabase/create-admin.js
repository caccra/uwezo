#!/usr/bin/env node
/**
 * Create (or promote) an admin account directly, bypassing sign-up/approval.
 *
 * Get the SERVICE ROLE key from Supabase -> Project Settings -> API
 * ("service_role", secret). Never put it in config.js or commit it — it
 * bypasses Row-Level Security entirely. Pass it as an env var so it never
 * lands in shell history as a plain argument.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
 *   node supabase/create-admin.js you@example.com "StrongPassword123!" "Your Name"
 *
 * Usage (bash):
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." node supabase/create-admin.js you@example.com "StrongPassword123!" "Your Name"
 *
 * If the email already has an account (e.g. you signed up through /signup),
 * this promotes that existing profile to admin/active instead of erroring.
 */

function readConfigJs() {
  const fs = require("fs");
  const path = require("path");
  const file = path.join(__dirname, "..", "config.js");
  const src = fs.readFileSync(file, "utf8");
  const urlMatch = src.match(/SUPABASE_URL:\s*["']([^"']+)["']/);
  if (!urlMatch) throw new Error("Could not find SUPABASE_URL in config.js");
  return urlMatch[1];
}

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !password) {
    console.error("Usage: node supabase/create-admin.js <email> <password> [full name]");
    process.exit(1);
  }
  if (!serviceKey) {
    console.error("Set SUPABASE_SERVICE_ROLE_KEY first (see the comment at the top of this file).");
    process.exit(1);
  }

  const url = readConfigJs();
  const headers = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
  };

  // 1. Try to create the auth user (pre-confirmed).
  let userId;
  const createRes = await fetch(url + "/auth/v1/admin/users", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email },
    }),
  });
  const createBody = await createRes.json();

  if (createRes.ok) {
    userId = createBody.id;
    console.log("Created auth user:", email);
  } else if (/already been registered|already exists/i.test(createBody.msg || createBody.message || "")) {
    // 2. Already exists -> look it up.
    const listRes = await fetch(url + "/auth/v1/admin/users?email=" + encodeURIComponent(email), { headers });
    const listBody = await listRes.json();
    const found = (listBody.users || []).find((u) => u.email === email);
    if (!found) throw new Error("User exists but could not be looked up: " + JSON.stringify(listBody));
    userId = found.id;
    console.log("Found existing auth user:", email);
  } else {
    throw new Error("Failed to create user: " + JSON.stringify(createBody));
  }

  // 3. Promote (or wait for) the profiles row created by the handle_new_user trigger.
  for (let attempt = 0; attempt < 5; attempt++) {
    const patchRes = await fetch(url + "/rest/v1/profiles?id=eq." + userId, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ role: "admin", status: "active", approved_at: new Date().toISOString() }),
    });
    const patchBody = await patchRes.json();
    if (patchRes.ok && Array.isArray(patchBody) && patchBody.length) {
      console.log("Promoted to admin:", patchBody[0].email);
      console.log("\nSign in at /login with that email and password.");
      return;
    }
    await new Promise((r) => setTimeout(r, 400)); // trigger may need a moment on first create
  }
  throw new Error("Auth user created, but no matching profiles row appeared. Check the handle_new_user trigger.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
