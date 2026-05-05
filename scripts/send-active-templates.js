import { PrismaClient } from "@prisma/client";
import { addBulkToQueue, processQueue } from "../src/lib/queue.js";

const prisma = new PrismaClient();

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildTemplateComponents(template) {
  const variables = parseJsonArray(template.variables);
  if (!variables.length) return [];

  return [
    {
      type: "body",
      parameters: variables.map(() => ({
        type: "text",
        text: "Test",
      })),
    },
  ];
}

async function resolveOrgId() {
  const orgId = process.env.ORG_ID || getArg("--org");
  if (orgId) return orgId;

  const creds = await prisma.whatsAppCredential.findMany({
    where: { isActive: true },
    select: { organizationId: true },
  });

  const uniqueOrgs = Array.from(new Set(creds.map((c) => c.organizationId)));
  if (uniqueOrgs.length === 1) return uniqueOrgs[0];

  throw new Error(
    uniqueOrgs.length === 0
      ? "No active WhatsApp credentials found. Set ORG_ID or connect WhatsApp."
      : `Multiple organizations found. Pass --org <id> or set ORG_ID. Found: ${uniqueOrgs.join(", ")}`,
  );
}

async function resolveCredential(orgId) {
  const cred = await prisma.whatsAppCredential.findFirst({
    where: { organizationId: orgId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { connectedAt: "desc" }],
    select: { id: true },
  });

  if (!cred) {
    throw new Error(`No active WhatsApp credential found for org ${orgId}`);
  }

  return cred.id;
}

async function resolveContact(orgId, phone) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return prisma.contact.findFirst({
    where: {
      organizationId: orgId,
      OR: [
        { phoneNumber: phone },
        { phoneNumber: normalized },
        { phoneNumber: { endsWith: normalized.replace(/^\+/, "") } },
      ],
    },
    select: { id: true, optInStatus: true },
  });
}

async function main() {
  const recipientPhone = process.env.TO || getArg("--to");
  if (!recipientPhone) {
    throw new Error("Missing recipient phone. Use --to +1234567890 or set TO.");
  }

  const orgId = await resolveOrgId();
  const credentialId = await resolveCredential(orgId);

  const contact = await resolveContact(orgId, recipientPhone);
  if (!contact) {
    throw new Error("Recipient is not a contact in this organization.");
  }
  if (contact.optInStatus !== "opted_in") {
    throw new Error(`Recipient optInStatus is ${contact.optInStatus}. Must be opted_in.`);
  }

  const templates = await prisma.messageTemplate.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { status: { in: ["approved", "APPROVED"] } },
        { whatsappTemplateId: { not: null } },
      ],
    },
    orderBy: { name: "asc" },
  });

  if (!templates.length) {
    throw new Error("No approved templates found for this organization.");
  }

  const queueMessages = templates.map((template) => {
    const components = buildTemplateComponents(template);
    const payload = {
      type: "template",
      templateId: template.id,
      templateName: template.name,
      language: template.language || "en_US",
      components,
    };

    return {
      recipientPhone,
      messageContent: JSON.stringify(payload),
      messageType: "template",
      contactId: contact.id,
    };
  });

  console.log(`Sending ${queueMessages.length} templates to ${recipientPhone} (org ${orgId})`);

  await addBulkToQueue(orgId, queueMessages, credentialId);
  const result = await processQueue(orgId, queueMessages.length);
  console.log("Queue processing result:", JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error("Template send failed:", err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
