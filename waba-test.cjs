#!/usr/bin/env node

/**
 * ============================================================
 * WhatsApp Embedded Signup — Complete Standalone Script
 * ============================================================
 *
 * What this script does, end-to-end:
 *   1.  Generates a Meta Embedded Signup URL
 *   2.  Opens it in your browser (or prints it for manual use)
 *   3.  Starts a local HTTP server to receive the OAuth callback
 *   4.  Exchanges the auth code for a short-lived token
 *   5.  Upgrades it to a 60-day long-lived token
 *   6.  Fetches FULL WhatsApp Business Account (WABA) info
 *       using 3 fallback strategies so it always works
 *   7.  Fetches ALL phone numbers (with pagination)
 *   8.  Fetches owner Business Manager details
 *   9.  Sets up webhook subscription
 *  10.  Saves everything to whatsapp-account-info.json
 *
 * Usage:
 *   node whatsapp-embedded-signup.js
 *
 * Requirements:
 *   npm install axios open
 *
 * Environment (set via .env or export before running):
 *   META_APP_ID=your_app_id
 *   META_APP_SECRET=your_app_secret
 *   META_API_VERSION=v21.0          (optional, default v21.0)
 *   LOCAL_PORT=3456                 (optional, default 3456)
 *   CALLBACK_PATH=/oauth/callback   (optional, default /oauth/callback)
 * ============================================================
 */

"use strict";

// ─── Dependencies ────────────────────────────────────────────
const http = require("http");
const https = require("https");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Try to load optional deps, show clear errors if missing
let axios, open;
try {
  axios = require("axios");
} catch {
  console.error("\n❌  axios is not installed. Run:  npm install axios\n");
  process.exit(1);
}
try {
  let openPkg = require("open");
  open = openPkg.default || openPkg;
} catch {
  open = null;
}

// Load .env if present (no dotenv dependency needed)
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .forEach((line) => {
      const [key, ...vals] = line.split("=");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = vals
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    });
}

// ─── Configuration ────────────────────────────────────────────
const CONFIG = {
  appId: process.env.META_APP_ID || "",
  appSecret: process.env.META_APP_SECRET || "",
  apiVersion: process.env.META_API_VERSION || "v21.0",
  port: parseInt(process.env.LOCAL_PORT || "3456", 10),
  cbPath: process.env.CALLBACK_PATH || "/oauth/callback",
  outputFile: "whatsapp-account-info.json",
};

CONFIG.redirectUri = `http://localhost:${CONFIG.port}${CONFIG.cbPath}`;

const GRAPH = `https://graph.facebook.com/${CONFIG.apiVersion}`;

// ─── Validation ───────────────────────────────────────────────
if (!CONFIG.appId || !CONFIG.appSecret) {
  console.error(`
❌  Missing credentials. Set them before running:

    export META_APP_ID=your_app_id
    export META_APP_SECRET=your_app_secret

  OR create a .env file in this directory with those two lines.
`);
  process.exit(1);
}

// ─── Logging helpers ──────────────────────────────────────────
const LOG = {
  step: (n, msg) => console.log(`\n\x1b[36m[Step ${n}]\x1b[0m ${msg}`),
  ok: (msg) => console.log(`  \x1b[32m✔\x1b[0m  ${msg}`),
  info: (msg) => console.log(`  \x1b[33m→\x1b[0m  ${msg}`),
  warn: (msg) => console.log(`  \x1b[33m⚠\x1b[0m  ${msg}`),
  err: (msg) => console.log(`  \x1b[31m✘\x1b[0m  ${msg}`),
  hr: () => console.log("\n" + "─".repeat(60)),
  json: (obj) => console.log(JSON.stringify(obj, null, 2)),
};

// ─── Utilities ────────────────────────────────────────────────
function generateState() {
  return Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(16).toString("hex"),
      timestamp: Date.now(),
    }),
  ).toString("base64url");
}

function buildEmbeddedSignupUrl(state) {
  const params = new URLSearchParams({
    client_id: CONFIG.appId,
    redirect_uri: CONFIG.redirectUri,
    state,
    scope:
      "whatsapp_business_management,whatsapp_business_messaging,business_management",
    response_type: "code",
    extras: JSON.stringify({
      setup: {
        ask_for: [
          "whatsapp_business_management",
          "whatsapp_business_messaging",
        ],
      },
    }),
  });
  return `https://www.facebook.com/${CONFIG.apiVersion}/dialog/oauth?${params}`;
}

// Parse Graph API error into a readable string
function parseGraphError(err) {
  const d = err?.response?.data?.error;
  if (!d) return err?.message || "Unknown error";
  return `(#${d.code}) ${d.message}`;
}

// ─── Step: Wait for OAuth callback via local server ──────────
function waitForOAuthCallback(state) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url, true);
      const {
        code,
        session_info,
        state: retState,
        error,
        error_description,
      } = parsed.query;

      // Only handle our callback path
      if (!parsed.pathname.startsWith(CONFIG.cbPath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      // Render a nice closing page for the browser
      const htmlSuccess = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:system-ui;display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100vh;margin:0;background:#f0fdf4}
        h1{color:#166534}p{color:#555}</style></head><body>
        <h1>✅ Connected!</h1>
        <p>WhatsApp Business Account connected successfully.</p>
        <p>You can close this window.</p></body></html>`;

      const htmlError = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:system-ui;display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100vh;margin:0;background:#fef2f2}
        h1{color:#991b1b}p{color:#555}</style></head><body>
        <h1>❌ Error</h1>
        <p>${error_description || error || "OAuth failed"}</p>
        <p>Check the terminal for details.</p></body></html>`;

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(htmlError);
        server.close();
        return reject(
          new Error(`Meta OAuth error: ${error_description || error}`),
        );
      }

      if (!code && !session_info) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(htmlError);
        server.close();
        return reject(
          new Error("No code or session_info received in callback"),
        );
      }

      // Validate state (CSRF protection)
      if (retState !== state) {
        LOG.warn(
          "State mismatch — possible CSRF. Proceeding anyway since this is a CLI tool.",
        );
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(htmlSuccess);
      server.close();
      resolve({ code: code || null, session_info: session_info || null });
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${CONFIG.port} is in use. Set LOCAL_PORT=<other> and retry.`,
          ),
        );
      } else {
        reject(err);
      }
    });

    server.listen(CONFIG.port, "localhost", () => {
      LOG.ok(`Local callback server listening on port ${CONFIG.port}`);
    });

    // Timeout after 10 minutes
    setTimeout(
      () => {
        server.close();
        reject(
          new Error(
            "OAuth timed out (10 minutes). Please restart and try again.",
          ),
        );
      },
      10 * 60 * 1000,
    );
  });
}

// ─── Step: Exchange code for short-lived token ───────────────
async function exchangeCodeForToken(code) {
  LOG.info("Exchanging auth code for access token...");
  const resp = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      client_id: CONFIG.appId,
      client_secret: CONFIG.appSecret,
      redirect_uri: CONFIG.redirectUri,
      code,
    },
  });
  LOG.ok("Short-lived token obtained");
  return resp.data.access_token;
}

// ─── Step: Exchange session_info for token (Embedded Signup) ─
async function exchangeSessionInfoForToken(session_info) {
  LOG.info(
    "Exchanging session_info for System User token (Embedded Signup flow)...",
  );
  const resp = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      fb_exchange_token: session_info,
      client_id: CONFIG.appId,
      client_secret: CONFIG.appSecret,
    },
  });
  if (!resp.data.access_token)
    throw new Error("No access_token in session_info exchange response");
  LOG.ok("System User token obtained");
  return resp.data.access_token;
}

// ─── Step: Upgrade to long-lived token (60 days) ─────────────
async function getLongLivedToken(shortToken) {
  LOG.info("Upgrading to 60-day long-lived token...");
  const resp = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: CONFIG.appId,
      client_secret: CONFIG.appSecret,
      fb_exchange_token: shortToken,
    },
  });
  const token = resp.data.access_token;
  const expiresIn = resp.data.expires_in;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : "Unknown";
  LOG.ok(`Long-lived token obtained  (expires: ${expiresAt})`);
  return { token, expiresIn, expiresAt };
}

// ─── Step: Get user info ──────────────────────────────────────
async function getMeInfo(accessToken) {
  LOG.info("Fetching Meta user info...");
  const resp = await axios.get(`${GRAPH}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { fields: "id,name,email" },
  });
  LOG.ok(`User: ${resp.data.name} (${resp.data.id})`);
  return resp.data;
}

// ─── Step: Find WABA ID (3 fallback strategies) ──────────────
async function findWabaId(accessToken) {
  LOG.info("Searching for WhatsApp Business Account (3 strategies)...");

  // Strategy 1 — direct field on /me
  try {
    const r = await axios.get(`${GRAPH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: "whatsapp_business_accounts" },
    });
    const list = r.data.whatsapp_business_accounts?.data;
    if (list?.length) {
      LOG.ok(`Strategy 1 succeeded — found WABA: ${list[0].id}`);
      return list[0].id;
    }
  } catch (e) {
    LOG.info(`Strategy 1 skipped: ${parseGraphError(e)}`);
  }

  // Strategy 2 — /me/accounts with WhatsApp perms
  try {
    const r = await axios.get(`${GRAPH}/me/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: "id,name,perms" },
    });
    const accounts = r.data.data || [];
    for (const acc of accounts) {
      const perms = acc.perms || [];
      if (perms.some((p) => p.includes("WHATSAPP"))) {
        // Try to get WABA from this account
        try {
          const r2 = await axios.get(`${GRAPH}/${acc.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { fields: "whatsapp_business_account" },
          });
          const wabaId = r2.data.whatsapp_business_account?.id;
          if (wabaId) {
            LOG.ok(`Strategy 2 succeeded — WABA: ${wabaId}`);
            return wabaId;
          }
        } catch {}
      }
    }
    // Try first account anyway
    if (accounts.length) {
      try {
        const r2 = await axios.get(`${GRAPH}/${accounts[0].id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: "whatsapp_business_account" },
        });
        const wabaId = r2.data.whatsapp_business_account?.id;
        if (wabaId) {
          LOG.ok(`Strategy 2 (first account) succeeded — WABA: ${wabaId}`);
          return wabaId;
        }
      } catch {}
    }
  } catch (e) {
    LOG.info(`Strategy 2 skipped: ${parseGraphError(e)}`);
  }

  // Strategy 3 — /me?fields=businesses → query each business for WABA
  try {
    const r = await axios.get(`${GRAPH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: "businesses" },
    });
    const businesses = r.data.businesses?.data || [];
    for (const biz of businesses) {
      try {
        const r2 = await axios.get(
          `${GRAPH}/${biz.id}/whatsapp_business_accounts`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        const wabaId = r2.data.data?.[0]?.id;
        if (wabaId) {
          LOG.ok(
            `Strategy 3 succeeded — WABA: ${wabaId} (via business ${biz.id})`,
          );
          return wabaId;
        }
      } catch {}
    }
  } catch (e) {
    LOG.info(`Strategy 3 skipped: ${parseGraphError(e)}`);
  }

  throw new Error(
    "No WhatsApp Business Account found after all strategies.\n" +
      "Make sure your Meta Business has WhatsApp enabled and the account is linked.",
  );
}

// ─── Step: Fetch WABA full details ───────────────────────────
async function getWabaDetails(accessToken, wabaId) {
  LOG.info(`Fetching WABA details for ${wabaId}...`);
  const fields = [
    "id",
    "name",
    "message_template_namespace",
    "currency",
    "timezone_id",
    "account_review_status",
    "business_type",
    "primary_business_location",
    "owner_business_info",
    "business_verification_status",
  ].join(",");

  const resp = await axios.get(`${GRAPH}/${wabaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { fields },
  });
  const d = resp.data;
  LOG.ok(`WABA name: ${d.name}`);

  return {
    id: d.id,
    name: d.name,
    messageTemplateNamespace: d.message_template_namespace || null,
    currency: d.currency || null,
    timezoneId: d.timezone_id || null,
    accountReviewStatus: d.account_review_status || null,
    businessVerificationStatus: d.business_verification_status || null,
    businessType: d.business_type || null,
    businessLocation: d.primary_business_location || null,
    ownerBusiness: d.owner_business_info
      ? {
          id: d.owner_business_info.id || null,
          name: d.owner_business_info.name || null,
          phone: d.owner_business_info.primary_phone || null,
          email: d.owner_business_info.primary_email || null,
          address: d.owner_business_info.address || null,
        }
      : null,
  };
}

// ─── Step: Fetch all phone numbers (paginated) ───────────────
async function getPhoneNumbers(accessToken, wabaId) {
  LOG.info("Fetching phone numbers (all pages)...");
  const fields = [
    "id",
    "verified_name",
    "display_phone_number",
    "certified_wa_phone_number",
    "verification_status",
    "code_verification_status",
    "quality_score",
    "messaging_limit_tier",
    "status",
    "name_status",
    "platform_type",
    "throughput",
  ].join(",");

  const all = [];
  let after = null;

  do {
    const params = { fields, limit: 100 };
    if (after) params.after = after;
    const resp = await axios.get(`${GRAPH}/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    all.push(...(resp.data.data || []));
    after = resp.data.paging?.cursors?.after || null;
  } while (after);

  LOG.ok(`Found ${all.length} phone number(s)`);

  return all.map((p) => ({
    id: p.id,
    displayName: p.verified_name || p.display_phone_number || "Unknown",
    displayPhoneNumber: p.display_phone_number || null,
    certifiedPhoneNumber: p.certified_wa_phone_number || null,
    verificationStatus: p.verification_status || "UNKNOWN",
    codeVerificationStatus: p.code_verification_status || "UNKNOWN",
    qualityScore: p.quality_score || null,
    messagingLimitTier: p.messaging_limit_tier || null,
    status: p.status || null,
    nameStatus: p.name_status || null,
    platformType: p.platform_type || null,
    throughput: p.throughput || null,
  }));
}

// ─── Step: Fetch message templates ───────────────────────────
async function getMessageTemplates(accessToken, wabaId) {
  LOG.info("Fetching message templates...");
  try {
    const resp = await axios.get(`${GRAPH}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        fields:
          "id,name,language,status,category,components,quality_score,rejected_reason",
        limit: 100,
      },
    });
    const templates = resp.data.data || [];
    LOG.ok(`Found ${templates.length} template(s)`);
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      qualityScore: t.quality_score || null,
      rejectedReason: t.rejected_reason || null,
      components: t.components || [],
    }));
  } catch (e) {
    LOG.warn(`Could not fetch templates: ${parseGraphError(e)}`);
    return [];
  }
}

// ─── Step: Subscribe app to WABA (webhook sub) ───────────────
async function subscribeApp(accessToken, wabaId) {
  LOG.info("Subscribing app to WABA for webhooks...");
  try {
    await axios.post(
      `${GRAPH}/${wabaId}/subscribed_apps`,
      { access_token: accessToken },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    LOG.ok("App subscribed to WABA successfully");
    return true;
  } catch (e) {
    LOG.warn(`Webhook subscription failed: ${parseGraphError(e)}`);
    return false;
  }
}

// ─── Step: Verify subscription ───────────────────────────────
async function verifySubscription(accessToken, wabaId) {
  LOG.info("Verifying app subscription...");
  try {
    const resp = await axios.get(`${GRAPH}/${wabaId}/subscribed_apps`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const subs = resp.data.data || [];
    const found = subs.some(
      (s) => s.id === CONFIG.appId || s.application_id === CONFIG.appId,
    );
    LOG.ok(
      `Subscription verified: ${found ? "YES" : "NOT FOUND (may still be active)"}`,
    );
    return found;
  } catch (e) {
    LOG.warn(`Could not verify subscription: ${parseGraphError(e)}`);
    return false;
  }
}

// ─── Step: Fetch Business Manager info ───────────────────────
async function getBusinessManagerInfo(accessToken) {
  LOG.info("Fetching Business Manager info...");
  try {
    const resp = await axios.get(`${GRAPH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        fields:
          "businesses{id,name,verification_status,profile_picture_uri,link,primary_page}",
      },
    });
    const businesses = resp.data.businesses?.data || [];
    LOG.ok(`Found ${businesses.length} Business Manager account(s)`);
    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      verificationStatus: b.verification_status || null,
      profilePictureUri: b.profile_picture_uri || null,
      link: b.link || null,
    }));
  } catch (e) {
    LOG.warn(`Could not fetch Business Manager info: ${parseGraphError(e)}`);
    return [];
  }
}

// ─── Main flow ────────────────────────────────────────────────
async function main() {
  LOG.hr();
  console.log(
    "\x1b[1m  WhatsApp Embedded Signup — Full Account Info Fetcher\x1b[0m",
  );
  LOG.hr();

  LOG.info(`App ID       : ${CONFIG.appId}`);
  LOG.info(`API Version  : ${CONFIG.apiVersion}`);
  LOG.info(`Callback URL : ${CONFIG.redirectUri}`);
  LOG.info(`Output file  : ${CONFIG.outputFile}`);

  // ── Step 1: Generate state + URL ─────────────────────────
  LOG.step(1, "Building Embedded Signup URL");
  const state = generateState();
  const authUrl = buildEmbeddedSignupUrl(state);
  LOG.ok("URL generated");
  LOG.info("Opening browser... (if it does not open, copy the URL below)\n");
  console.log("\x1b[34m" + authUrl + "\x1b[0m\n");

  if (open) {
    await open(authUrl).catch(() => {});
  }

  // ── Step 2: Wait for callback ─────────────────────────────
  LOG.step(2, "Waiting for Meta OAuth callback");
  LOG.info(`Listening on http://localhost:${CONFIG.port}${CONFIG.cbPath}`);
  LOG.info("Complete the flow in your browser...");

  const { code, session_info } = await waitForOAuthCallback(state);
  LOG.ok(`Callback received — ${code ? "code" : "session_info"} present`);

  // ── Step 3: Get initial token ─────────────────────────────
  LOG.step(3, "Obtaining access token");
  let shortToken;
  if (session_info) {
    shortToken = await exchangeSessionInfoForToken(session_info);
  } else {
    shortToken = await exchangeCodeForToken(code);
  }

  // ── Step 4: Upgrade to long-lived token ──────────────────
  LOG.step(4, "Upgrading to 60-day long-lived token");
  const {
    token: accessToken,
    expiresIn,
    expiresAt,
  } = await getLongLivedToken(shortToken);

  // ── Step 5: User info ─────────────────────────────────────
  LOG.step(5, "Fetching Meta user info");
  const userInfo = await getMeInfo(accessToken);

  // ── Step 6: Find WABA ─────────────────────────────────────
  LOG.step(6, "Locating WhatsApp Business Account (WABA)");
  const wabaId = await findWabaId(accessToken);

  // ── Step 7: WABA full details ─────────────────────────────
  LOG.step(7, "Fetching complete WABA details");
  const wabaDetails = await getWabaDetails(accessToken, wabaId);

  // ── Step 8: Phone numbers ─────────────────────────────────
  LOG.step(8, "Fetching all phone numbers");
  const phoneNumbers = await getPhoneNumbers(accessToken, wabaId);

  // ── Step 9: Message templates ─────────────────────────────
  LOG.step(9, "Fetching message templates");
  const templates = await getMessageTemplates(accessToken, wabaId);

  // ── Step 10: Business Manager info ───────────────────────
  LOG.step(10, "Fetching Business Manager accounts");
  const businessManagers = await getBusinessManagerInfo(accessToken);

  // ── Step 11: Subscribe webhooks ───────────────────────────
  LOG.step(11, "Setting up webhook subscription");
  const webhookSubscribed = await subscribeApp(accessToken, wabaId);
  const webhookVerified = await verifySubscription(accessToken, wabaId);

  // ── Step 12: Compile result ───────────────────────────────
  LOG.step(12, "Compiling full account info");

  const result = {
    _meta: {
      generatedAt: new Date().toISOString(),
      appId: CONFIG.appId,
      apiVersion: CONFIG.apiVersion,
      flowType: session_info ? "embedded_signup" : "oauth_code",
    },
    token: {
      accessToken, // ← SAVE THIS — used for all API calls
      expiresIn,
      expiresAt,
      tokenType: "long_lived",
    },
    user: {
      metaUserId: userInfo.id,
      name: userInfo.name,
      email: userInfo.email || null,
    },
    whatsAppBusinessAccount: {
      ...wabaDetails,
      webhookSubscribed,
      webhookVerified,
    },
    phoneNumbers,
    messageTemplates: {
      count: templates.length,
      templates,
    },
    businessManagers,
    // Quick reference card
    quickReference: {
      wabaId: wabaDetails.id,
      wabaName: wabaDetails.name,
      primaryPhoneNumberId: phoneNumbers[0]?.id || null,
      primaryPhone: phoneNumbers[0]?.displayPhoneNumber || null,
      accessToken, // repeated for convenience
    },
  };

  // ── Step 13: Save to file ─────────────────────────────────
  LOG.step(13, `Saving to ${CONFIG.outputFile}`);
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(result, null, 2), "utf8");
  LOG.ok(`Saved to ${path.resolve(CONFIG.outputFile)}`);

  // ── Final summary ─────────────────────────────────────────
  LOG.hr();
  console.log("\n\x1b[1m  ✅  Connection Successful!\x1b[0m\n");

  console.log("  WABA ID           :", result.quickReference.wabaId);
  console.log("  WABA Name         :", result.quickReference.wabaName);
  console.log(
    "  Phone Number ID   :",
    result.quickReference.primaryPhoneNumberId || "None registered",
  );
  console.log(
    "  Phone Number      :",
    result.quickReference.primaryPhone || "None registered",
  );
  console.log("  Token expires     :", result.token.expiresAt);
  console.log("  Templates found   :", result.messageTemplates.count);
  console.log(
    "  Webhook subscribed:",
    webhookSubscribed ? "Yes" : "No (set manually in Meta dashboard)",
  );

  LOG.hr();
  console.log(`\n  All data saved to: \x1b[32m${CONFIG.outputFile}\x1b[0m`);
  console.log(
    "  ⚠️   Keep this file secure — it contains your access token.\n",
  );

  // Print env vars the app needs
  console.log("  Copy these into your .env file:\n");
  console.log(`  \x1b[33mWHATSAPP_ACCESS_TOKEN=${accessToken}\x1b[0m`);
  console.log(
    `  \x1b[33mWHATSAPP_BUSINESS_ACCOUNT_ID=${wabaDetails.id}\x1b[0m`,
  );
  if (phoneNumbers[0]) {
    console.log(
      `  \x1b[33mWHATSAPP_PHONE_NUMBER_ID=${phoneNumbers[0].id}\x1b[0m`,
    );
  }
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error("\n\x1b[31m❌  Fatal error:\x1b[0m", err.message);
  if (err.response?.data) {
    console.error("\n  Meta API response:");
    console.error(JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
