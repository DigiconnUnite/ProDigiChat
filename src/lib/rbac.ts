/**
 * RBAC (Role-Based Access Control) Middleware
 * 
 * Provides role hierarchy and permission checking for organization-based access control.
 * 
 * Role hierarchy (higher = more permissions):
 * - owner > admin > manager > member > viewer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

// Export OrganizationRole type for use in other modules
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

// Role hierarchy: higher number = more permissions
export const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  viewer: 1,
  member: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

/**
 * Check if a user's role meets or exceeds the minimum required role
 */
export function hasRole(userRole: OrganizationRole, minRole: OrganizationRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get user's role in an organization
 */
export async function getUserOrganizationRole(
  userId: string,
  organizationId: string
): Promise<OrganizationRole | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!membership || !membership.isActive) {
    return null;
  }

  return membership.role as OrganizationRole;
}

/**
 * Require a minimum role for a request
 * Returns NextResponse with error if unauthorized, null if authorized
 */
export async function requireRole(
  request: NextRequest,
  minRole: OrganizationRole
): Promise<NextResponse | null> {
  const token = await getToken({ req: request });

  if (!token?.sub || !token?.organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userRole = await getUserOrganizationRole(token.sub, token.organizationId);

  if (!userRole || !hasRole(userRole, minRole)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  return null; // Authorized
}

/**
 * Check if user can launch campaigns (owner, admin, manager, member)
 * Viewers cannot launch campaigns
 */
export function canLaunchCampaign(role: OrganizationRole): boolean {
  return hasRole(role, 'member');
}

/**
 * Check if user can manage contacts (owner, admin, manager, member)
 * Viewers cannot manage contacts
 */
export function canManageContacts(role: OrganizationRole): boolean {
  return hasRole(role, 'member');
}

/**
 * Check if user can change settings (owner, admin, manager)
 * Members and viewers cannot change settings
 */
export function canChangeSettings(role: OrganizationRole): boolean {
  return hasRole(role, 'manager');
}

/**
 * Check if user can delete organization (owner only)
 * Only owners can delete their organization
 */
export function canDeleteOrganization(role: OrganizationRole): boolean {
  return role === 'owner';
}

/**
 * Middleware wrapper that enforces RBAC for a route
 * Use this to protect routes with specific role requirements
 */
export function withRoleGuard(
  minRole: OrganizationRole,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const unauthorizedResponse = await requireRole(request, minRole);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }
    return handler(request);
  };
}