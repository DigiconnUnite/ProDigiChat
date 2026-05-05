/**
 * Shared API authentication / authorization helpers.
 *
 * The historical pattern in this codebase was to read `organizationId`
 * from the request body, falling back to the session. That pattern lets
 * any authenticated user act on data belonging to organizations they do
 * not belong to. Use the helpers here instead — they always derive the
 * org context from the verified JWT and validate that the user actually
 * belongs to that org.
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  OrganizationRole,
  getUserOrganizationRole,
  hasRole,
} from "@/lib/rbac";

export interface OrgContext {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
}

export type OrgContextResult =
  | { ok: true; context: OrgContext }
  | { ok: false; response: NextResponse };

/**
 * Resolve the authenticated user's organization context.
 *
 * - 401 if the request has no valid session.
 * - 403 if the user has no active membership in the org from their token,
 *   or if their role is below `minRole`.
 *
 * Always returns the org id derived from the JWT — never trusts request
 * bodies or query params.
 */
export async function resolveOrgContext(
  request: NextRequest | Request,
  minRole: OrganizationRole = "viewer",
): Promise<OrgContextResult> {
  const token = await getToken({ req: request as NextRequest });

  if (!token?.sub) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const organizationId = (token.organizationId || token.orgId) as
    | string
    | undefined;
  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: no active organization" },
        { status: 403 },
      ),
    };
  }

  const role = await getUserOrganizationRole(token.sub, organizationId);
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: not a member of this organization" },
        { status: 403 },
      ),
    };
  }

  if (!hasRole(role, minRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    context: { userId: token.sub, organizationId, role },
  };
}

/**
 * Convenience wrapper that throws nothing — use it inside route handlers
 * where the early-return pattern is convenient.
 *
 * Usage:
 *   const auth = await requireOrg(request, 'manager');
 *   if (!auth.ok) return auth.response;
 *   const { userId, organizationId, role } = auth.context;
 */
export const requireOrg = resolveOrgContext;
