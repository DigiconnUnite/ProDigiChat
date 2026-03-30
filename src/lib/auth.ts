// Re-export auth options from NextAuth route handler
export { authOptions } from "@/app/api/auth/[...nextauth]/route"

// Re-export RBAC utilities from the dedicated rbac module
export type { OrganizationRole, OrganizationRole as Role } from '@/lib/rbac'
export {
  ROLE_HIERARCHY,
  hasRole,
  getUserOrganizationRole,
  requireRole,
  canLaunchCampaign,
  canManageContacts,
  canChangeSettings,
  canDeleteOrganization,
  withRoleGuard,
} from '@/lib/rbac'
