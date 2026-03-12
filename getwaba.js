// ==========================================
// WhatsApp Business API - Account Info Script
// ==========================================

const ACCESS_TOKEN =
  "EAAhQMlZAIIbgBQ64TENtfGAkDugbtlFVoEtaVMeYBULwIXjzrEZBw5s1MobjGSXZAoZAKw0lcBOP183YF9Hs5heuDNV7ZAKExvCnsZCWo4tPslPFVLVWdyzJzpcIZCTwvkiZA898ykWU8w47OCLPZALxsexLexp3ep8S3QtiZAs4LmpBJFt5mkqriAVkV4YppozfpUFTulkIPi1WDpwrUlggTj5TuVbPsVZBpdPiZA3ZBIjsYMvRqRRh4FJ7fJnaL8DyRs1CcpxM5qd4i6foYuZBKAdqJAHqDDDNTnLraxDgZDZD";
const WABA_ID = "798951219915878";
const PHONE_NUMBER_ID = "1015531584980370";
const API_VERSION = "v19.0";

// ==========================================
// Fetch Functions
// ==========================================

// Get User Info
async function getUserInfo() {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/me?fields=id,name,email,picture&access_token=${ACCESS_TOKEN}`,
  );
  return response.json();
}

// Get WABA Account Info
async function getWABAAccount() {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}?fields=id,name,currency,timezone_id,message_template_namespace,account_review_status,business_type,primary_business_location&access_token=${ACCESS_TOKEN}`,
  );
  return response.json();
}

// Get Phone Numbers
async function getPhoneNumbers() {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status&access_token=${ACCESS_TOKEN}`,
  );
  return response.json();
}

// Get Specific Phone Number
async function getSpecificPhone() {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status,certificate&access_token=${ACCESS_TOKEN}`,
  );
  return response.json();
}

// Get Token Info
async function getTokenInfo() {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`,
  );
  return response.json();
}

// Get Business Info
async function getBusinessInfo() {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}?fields=owner_business_info{id,name,primary_phone,primary_email,address}&access_token=${ACCESS_TOKEN}`,
  );
  return response.json();
}

// Get Message Templates
async function getMessageTemplates() {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?limit=10&access_token=${ACCESS_TOKEN}`,
  );
  return response.json();
}

// ==========================================
// Main Function
// ==========================================

async function getAllAccountInfo() {
  console.log("\n");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("        📱 WHATSAPP BUSINESS API - ACCOUNT INFORMATION");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("\n");

  try {
    // 1. User Info
    console.log("👤 USER INFORMATION");
    console.log("─────────────────────────────────────────");
    const user = await getUserInfo();
    console.log(`   Name: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email || "N/A"}`);
    console.log("\n");

    // 2. Token Info
    console.log("🔑 TOKEN INFORMATION");
    console.log("─────────────────────────────────────────");
    const tokenInfo = await getTokenInfo();
    if (tokenInfo.data) {
      console.log(`   Valid: ${tokenInfo.data.is_valid ? "✅ Yes" : "❌ No"}`);
      console.log(`   App: ${tokenInfo.data.application}`);
      console.log(`   App ID: ${tokenInfo.data.app_id}`);
      console.log(`   Type: ${tokenInfo.data.type}`);
      console.log(
        `   Expires At: ${new Date(tokenInfo.data.expires_at * 1000).toLocaleString()}`,
      );
      console.log(`   Scopes: ${tokenInfo.data.scopes?.join(", ")}`);
    }
    console.log("\n");

    // 3. WABA Account Info
    console.log("🏢 WABA ACCOUNT INFORMATION");
    console.log("─────────────────────────────────────────");
    const waba = await getWABAAccount();
    console.log(`   Name: ${waba.name}`);
    console.log(`   ID: ${waba.id}`);
    console.log(`   Currency: ${waba.currency || "N/A"}`);
    console.log(`   Timezone ID: ${waba.timezone_id || "N/A"}`);
    console.log(`   Review Status: ${waba.account_review_status || "N/A"}`);
    console.log(
      `   Template Namespace: ${waba.message_template_namespace || "N/A"}`,
    );
    console.log("\n");

    // 4. Phone Numbers
    console.log("📞 PHONE NUMBERS");
    console.log("─────────────────────────────────────────");
    const phones = await getPhoneNumbers();
    if (phones.data && phones.data.length > 0) {
      phones.data.forEach((phone, index) => {
        console.log(`   [${index + 1}] ${phone.display_phone_number}`);
        console.log(`       Verified Name: ${phone.verified_name}`);
        console.log(`       Phone ID: ${phone.id}`);
        console.log(`       Quality: ${phone.quality_rating || "N/A"}`);
        console.log(`       Tier: ${phone.messaging_limit_tier || "N/A"}`);
        console.log(`       Status: ${phone.status}`);
        console.log("");
      });
    } else {
      console.log("   No phone numbers found");
    }
    console.log("\n");

    // 5. Specific Phone Number Details
    console.log("📱 SPECIFIC PHONE NUMBER DETAILS");
    console.log("─────────────────────────────────────────");
    const specificPhone = await getSpecificPhone();
    console.log(`   Number: ${specificPhone.display_phone_number}`);
    console.log(`   ID: ${specificPhone.id}`);
    console.log(`   Verified Name: ${specificPhone.verified_name}`);
    console.log(`   Quality Rating: ${specificPhone.quality_rating}`);
    console.log(`   Messaging Tier: ${specificPhone.messaging_limit_tier}`);
    console.log(`   Status: ${specificPhone.status}`);
    console.log("\n");

    // 6. Message Templates (optional)
    console.log("📝 MESSAGE TEMPLATES (First 5)");
    console.log("─────────────────────────────────────────");
    try {
      const templates = await getMessageTemplates();
      if (templates.data && templates.data.length > 0) {
        templates.data.slice(0, 5).forEach((template, index) => {
          console.log(`   [${index + 1}] ${template.name}`);
          console.log(`       Status: ${template.status}`);
          console.log(`       Category: ${template.category}`);
          console.log("");
        });
      } else {
        console.log("   No templates found");
      }
    } catch (e) {
      console.log("   Unable to fetch templates");
    }
    console.log("\n");

    // Summary
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log("                        📊 SUMMARY");
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log(`   User: ${user.name}`);
    console.log(`   WABA Account: ${waba.name || WABA_ID}`);
    console.log(`   Phone Numbers: ${phones.data?.length || 0}`);
    console.log(
      `   Token Valid: ${tokenInfo.data?.is_valid ? "Yes ✅" : "No ❌"}`,
    );
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log("\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the script
getAllAccountInfo();
