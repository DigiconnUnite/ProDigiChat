/**
 * Messaging policy gate.
 *
 * Centralizes the WhatsApp / Meta-imposed rules a message must satisfy
 * before it can be sent to a contact. Used by the queue worker and by
 * the direct send routes so that all outbound paths enforce the same
 * checks.
 *
 * Rules currently enforced:
 *
 *  1. The contact must exist in the caller's organization. If the
 *     phone number isn't a known contact, we refuse the send rather
 *     than silently creating an "unknown opt-in status" recipient.
 *
 *  2. The contact must have `optInStatus === 'opted_in'`. Pending /
 *     opted_out contacts cannot receive marketing or freeform sends.
 *     This is required by Meta's Business Messaging policy and
 *     mirrors the filter that the campaign launch route already
 *     applies.
 *
 *  3. For *freeform* (non-template) messages, the contact must have
 *     sent us an inbound message within the last 24 hours. This is
 *     the Meta "customer-care window" / 24-hour rule. Template
 *     messages bypass this rule because they are pre-approved by Meta
 *     for unsolicited delivery.
 *
 *  4. Soft-deleted contacts cannot receive any messages.
 */
import { prisma } from "@/lib/prisma";

/** 24 hours in milliseconds. */
export const CUSTOMER_CARE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PolicyDecision =
  | { ok: true; contact: ResolvedContact }
  | { ok: false; reason: PolicyDenyReason; message: string };

export type PolicyDenyReason =
  | "contact_not_found"
  | "contact_deleted"
  | "not_opted_in"
  | "opted_out"
  | "outside_24h_window";

/** A minimal Contact projection used by the policy gate and downstream. */
export interface ResolvedContact {
  id: string;
  organizationId: string | null;
  phoneNumber: string;
  optInStatus: string;
  lastInboundAt: Date | null;
  isDeleted: boolean;
}

export interface MessagingPolicyInput {
  organizationId: string;
  /** Either a Prisma Contact id, or an E.164 phone number, or both. */
  contactId?: string | null;
  phoneNumber?: string | null;
  /**
   * Whether the outbound message is a Meta-approved template
   * (`true`) or a freeform / text / media message (`false`). Templates
   * may be sent outside the 24h window; freeform may not.
   */
  isTemplate: boolean;
}

/**
 * Look up the contact, normalizing across the multiple ways callers
 * may identify them. Returns `null` if no contact matches in the
 * caller's organization.
 */
async function resolveContact(
  input: MessagingPolicyInput,
): Promise<ResolvedContact | null> {
  const { organizationId, contactId, phoneNumber } = input;

  if (contactId) {
    const c = await prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      select: {
        id: true,
        organizationId: true,
        phoneNumber: true,
        optInStatus: true,
        lastInboundAt: true,
        isDeleted: true,
      },
    });
    if (c) return c as ResolvedContact;
  }

  if (phoneNumber) {
    const normalized = phoneNumber.replace(/[^\d+]/g, "");
    const c = await prisma.contact.findFirst({
      where: {
        organizationId,
        OR: [
          { phoneNumber },
          { phoneNumber: normalized },
          { phoneNumber: { endsWith: normalized.replace(/^\+/, "") } },
        ],
      },
      select: {
        id: true,
        organizationId: true,
        phoneNumber: true,
        optInStatus: true,
        lastInboundAt: true,
        isDeleted: true,
      },
    });
    if (c) return c as ResolvedContact;
  }

  return null;
}

/**
 * Check whether sending a message to the given contact is allowed
 * under the messaging policy. Returns a discriminated union:
 *
 *   { ok: true, contact }                       -> allowed
 *   { ok: false, reason, message }              -> denied
 *
 * Callers should treat this as the *single* gate before calling Meta.
 */
export async function evaluateOutboundPolicy(
  input: MessagingPolicyInput,
): Promise<PolicyDecision> {
  const contact = await resolveContact(input);

  if (!contact) {
    return {
      ok: false,
      reason: "contact_not_found",
      message:
        "Recipient is not a known contact in this organization. Add the contact and capture their opt-in before sending.",
    };
  }

  if (contact.isDeleted) {
    return {
      ok: false,
      reason: "contact_deleted",
      message: "Recipient is a deleted contact and cannot be messaged.",
    };
  }

  if (contact.optInStatus === "opted_out") {
    return {
      ok: false,
      reason: "opted_out",
      message: "Recipient has opted out of WhatsApp messages.",
    };
  }

  if (contact.optInStatus !== "opted_in") {
    return {
      ok: false,
      reason: "not_opted_in",
      message:
        "Recipient has not opted in. WhatsApp Business Policy requires explicit opt-in before sending.",
    };
  }

  if (!input.isTemplate) {
    const lastInbound = contact.lastInboundAt?.getTime() ?? 0;
    const ageMs = Date.now() - lastInbound;
    if (!lastInbound || ageMs > CUSTOMER_CARE_WINDOW_MS) {
      return {
        ok: false,
        reason: "outside_24h_window",
        message:
          "Recipient is outside the 24-hour customer-care window. Send an approved template message instead, or wait for the recipient to message you first.",
      };
    }
  }

  return { ok: true, contact };
}

/**
 * Variant that throws `MessagingPolicyError` on denial. Useful inside
 * the queue worker, which already wraps message sends in a try/catch
 * and converts thrown errors into queue-row failure records.
 */
export async function assertOutboundPolicy(
  input: MessagingPolicyInput,
): Promise<ResolvedContact> {
  const decision = await evaluateOutboundPolicy(input);
  if (!decision.ok) {
    throw new MessagingPolicyError(decision.reason, decision.message);
  }
  return decision.contact;
}

export class MessagingPolicyError extends Error {
  reason: PolicyDenyReason;
  constructor(reason: PolicyDenyReason, message: string) {
    super(message);
    this.name = "MessagingPolicyError";
    this.reason = reason;
  }
}
