'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Plus,
  Mail,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  X,
  Users,
  Shield,
  Crown,
  Eye,
  ChevronRight,
  Send,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'active' | 'invited';
  invitedAt: string;
  acceptedAt?: string;
  lastActive?: string;
}

interface Permissions {
  [role: string]: {
    manageBilling: boolean;
    manageTeam: boolean;
    createCampaigns: boolean;
    launchCampaigns: boolean;
    manageContacts: boolean;
    viewAnalytics: boolean;
    manageSettings: boolean;
  };
}

interface TeamSettingsTabProps {
  organizationId: string;
}

// ═══════════════════════════════════════════════════════════════
// REUSABLE STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StyledCard({
  children,
  className = "",
  title,
  description,
  titleIcon: TitleIcon,
  headerRight,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  titleIcon?: any;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className={`p-5 rounded-xl border-2 border-green-950 bg-white transition-all ${className}`}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                {TitleIcon && <TitleIcon className="h-5 w-5" />}
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm mt-1">{description}</p>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2 ml-4 flex-shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
    </div>
  );
}

function PermissionCheck({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
      <CheckCircle className="h-4 w-4 text-green-600" />
    </div>
  ) : (
    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
      <X className="h-3.5 w-3.5 text-slate-400" />
    </div>
  );
}

const ROLE_CONFIG: Record<string, { label: string; badgeClass: string; icon: any }> = {
  owner: { label: 'Owner', badgeClass: 'bg-green-100 text-green-800 border-green-200', icon: Crown },
  admin: { label: 'Admin', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', icon: Shield },
  manager: { label: 'Manager', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', icon: UserCog },
  member: { label: 'Member', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', icon: Users },
  viewer: { label: 'Viewer', badgeClass: 'bg-slate-50 text-slate-600 border-slate-200', icon: Eye },
};

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  manageBilling: { label: 'Manage billing', description: 'Access invoices, update payment methods' },
  manageTeam: { label: 'Manage team', description: 'Invite, remove, and change roles' },
  createCampaigns: { label: 'Create campaigns', description: 'Draft new WhatsApp campaigns' },
  launchCampaigns: { label: 'Launch campaigns', description: 'Send and schedule campaigns' },
  manageContacts: { label: 'Manage contacts', description: 'Add, import, and segment contacts' },
  viewAnalytics: { label: 'View analytics', description: 'Access reports and dashboards' },
  manageSettings: { label: 'Manage settings', description: 'Configure API keys, webhooks, etc.' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function TeamSettingsTab({ organizationId }: TeamSettingsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
    fetchPermissions();
  }, [organizationId]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/settings/team?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/settings/team', { method: 'OPTIONS' });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        toast.success('Invitation sent successfully');
        setInviteEmail('');
        setInviteRole('member');
        setShowInviteForm(false);
        fetchTeamMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          memberId: editingMember.id,
          role: editRole,
        }),
      });

      if (response.ok) {
        toast.success('Role updated successfully');
        setEditingMember(null);
        fetchTeamMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    setRemovingMember(memberId);
    try {
      const response = await fetch(`/api/settings/team?id=${memberId}&organizationId=${organizationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Team member removed successfully');
        fetchTeamMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const handleResendInvite = async (memberId: string) => {
    try {
      const response = await fetch(`/api/settings/team?id=${memberId}&organizationId=${organizationId}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success('Invitation resent successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-green-100 text-green-700',
      'bg-blue-100 text-blue-700',
      'bg-amber-100 text-amber-700',
      'bg-purple-100 text-purple-700',
      'bg-rose-100 text-rose-700',
      'bg-cyan-100 text-cyan-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const activeCount = members.filter(m => m.status === 'active').length;
  const invitedCount = members.filter(m => m.status === 'invited').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold mb-1">Team Management</h1>
        <p className="text-muted-foreground text-lg">Invite members and manage their access roles</p>
      </div>

  
      {/* Team Members */}
      <StyledCard>
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              Team Members
            </h3>
            <p className="text-muted-foreground text-sm mt-1">{members.length} of 10 seats used on Professional plan</p>
          </div>
          <Button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className={`rounded-lg text-sm transition-all ${showInviteForm
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
          >
            {showInviteForm ? (
              'Cancel'
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </>
            )}
          </Button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="p-5 rounded-xl border-2 border-green-950 bg-green-50/30 mb-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-semibold text-foreground">Send Invitation</h4>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-sm font-medium text-foreground">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="team@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-10 text-sm rounded-lg border-slate-300"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                  Role
                </Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role" className="text-sm rounded-lg border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-3.5 h-3.5" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={handleInvite}
                disabled={isSaving || !inviteEmail}
                className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Members List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No team members yet</p>
            <p className="text-xs text-muted-foreground mt-1">Invite your first team member to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
              const RoleIcon = roleConfig.icon;
              const isActive = member.status === 'active';

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-green-950/40 transition-all group"
                >
                  {/* Avatar */}
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 font-semibold text-sm ${member.avatar
                      ? 'overflow-hidden'
                      : getAvatarColor(member.name)
                    }`}>
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(member.name)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{member.name}</span>
                      <Badge className={`${roleConfig.badgeClass} text-xs border flex items-center gap-1`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-muted-foreground">
                        {isActive
                          ? (member.lastActive ? `Active ${formatDate(member.lastActive)}` : 'Active')
                          : `Invited ${formatDate(member.invitedAt)}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-amber-400'}`} />
                    <span className="text-xs text-muted-foreground">
                      {isActive ? 'Active' : 'Pending'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {member.status === 'invited' && (
                      <Button
                        onClick={() => handleResendInvite(member.id)}
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-slate-300 text-xs h-8"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend
                      </Button>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-slate-300 text-xs h-8"
                          onClick={() => {
                            setEditingMember(member);
                            setEditRole(member.role);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-xl border-2 border-slate-200">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Edit Member Role</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Change the role for {member.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-semibold ${member.avatar ? 'overflow-hidden' : getAvatarColor(member.name)
                              }`}>
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                              ) : (
                                getInitials(member.name)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-role" className="text-sm font-medium text-foreground">
                              New Role
                            </Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                              <SelectTrigger id="edit-role" className="rounded-lg border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <config.icon className="w-3.5 h-3.5" />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingMember(null)} className="rounded-lg border-slate-300">
                            Cancel
                          </Button>
                          <Button onClick={handleUpdateRole} disabled={isSaving} className="rounded-lg bg-green-600 hover:bg-green-700 text-white">
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs h-8"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMember === member.id}
                    >
                      {removingMember === member.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </StyledCard>

      {/* Role Permissions */}
      <StyledCard>
        <SectionHeader
          title="Role Permissions"
          description="What each role can do in ProDigiChat"
        />

        {permissions ? (
          <div className="rounded-xl border  bg-white border-green-950 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-950 border-none ">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted min-w-[200px]">
                    Permission
                  </th>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <th key={key} className="text-center py-3 px-4 text-xs font-medium text-muted min-w-[90px]">
                        <div className="flex flex-col items-center gap-1">
                          <Icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => (
                  <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </td>
                    {Object.keys(ROLE_CONFIG).map((role) => (
                      <td key={role} className="py-3 px-4">
                        <div className="flex justify-center">
                          <PermissionCheck enabled={permissions[role]?.[key as keyof typeof permissions.owner] || false} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted" />
          </div>
        )}

        {/* Permission descriptions */}
        <div className="mt-6 p-4 rounded-xl bg-green-950 border border-green-800">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            Role Hierarchy
          </h4>
          <p className="text-xs text-gray-300 mt-2">
            Roles follow a hierarchy — higher roles inherit all permissions from lower roles.
            <span className="block mt-1 text-green-400 font-medium">
              Owner → Admin → Manager → Member → Viewer
            </span>
          </p>
        </div>
      </StyledCard>
    </div>
  );
}