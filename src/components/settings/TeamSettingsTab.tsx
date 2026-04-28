'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Loader2, 
  Plus, 
  Mail, 
  MoreVertical, 
  Edit, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  Clock,
  Users,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { TEAM_ROLES } from '@/lib/constants/settings';

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

  // Fetch team members and permissions
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
        const data = await response.json();
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
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-green-100 text-green-800 border-green-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'manager': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'member': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'viewer': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'invited': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Team Management</h2>
        <p className="text-sm text-gray-500 mt-1">Invite members and manage their access roles</p>
      </div>

      {/* Team Members Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Team Members</h3>
            <p className="text-sm text-gray-500 mt-0.5">{members.length} of 10 seats used on Professional plan</p>
          </div>
          <Button onClick={() => setShowInviteForm(!showInviteForm)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2">
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-gray-50 rounded-md p-4 mb-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                <Input
                  type="email"
                  placeholder="team@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInvite} disabled={isSaving} size="sm" className="text-xs px-3 py-1.5">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
              <Button onClick={() => setShowInviteForm(false)} variant="outline" size="sm" className="text-xs px-3 py-1.5">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Members Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Member</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Role</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Last Active</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-medium text-xs">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          getInitials(member.name)
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <Badge className={getRoleBadgeColor(member.role)} variant="outline">
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <Badge className={getStatusBadgeColor(member.status)} variant="outline">
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-600">
                    {member.lastActive ? formatDate(member.lastActive) : 'Never'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {member.status === 'invited' && (
                        <Button
                          onClick={() => handleResendInvite(member.id)}
                          variant="outline"
                          size="sm"
                          className="text-xs px-3 py-1.5"
                        >
                          Resend
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-1.5"
                            onClick={() => {
                              setEditingMember(member);
                              setEditRole(member.role);
                            }}
                          >
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Member Role</DialogTitle>
                            <DialogDescription>
                              Change the role for {member.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-role">Role</Label>
                              <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger id="edit-role">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">Owner</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingMember(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateRole} disabled={isSaving}>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Role Permissions Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Role Permissions</h3>
        <p className="text-sm text-gray-500 mb-4">What each role can do in ProDigiChat</p>
        
        {permissions ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Permission</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Owner</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Admin</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Manager</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Member</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Viewer</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-900">Manage billing</td>
                <td className="py-2 px-3">{permissions.owner.manageBilling ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.admin.manageBilling ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.manager.manageBilling ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.member.manageBilling ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.viewer.manageBilling ? '✓' : '—'}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-900">Manage team</td>
                <td className="py-2 px-3">{permissions.owner.manageTeam ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.admin.manageTeam ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.manager.manageTeam ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.member.manageTeam ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.viewer.manageTeam ? '✓' : '—'}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-900">Create campaigns</td>
                <td className="py-2 px-3">{permissions.owner.createCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.admin.createCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.manager.createCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.member.createCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.viewer.createCampaigns ? '✓' : '—'}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-900">Launch campaigns</td>
                <td className="py-2 px-3">{permissions.owner.launchCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.admin.launchCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.manager.launchCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.member.launchCampaigns ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.viewer.launchCampaigns ? '✓' : '—'}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-900">Manage contacts</td>
                <td className="py-2 px-3">{permissions.owner.manageContacts ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.admin.manageContacts ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.manager.manageContacts ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.member.manageContacts ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.viewer.manageContacts ? '✓' : '—'}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-900">View analytics</td>
                <td className="py-2 px-3">{permissions.owner.viewAnalytics ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.admin.viewAnalytics ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.manager.viewAnalytics ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.member.viewAnalytics ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.viewer.viewAnalytics ? '✓' : '—'}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-gray-900">Manage settings</td>
                <td className="py-2 px-3">{permissions.owner.manageSettings ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.admin.manageSettings ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.manager.manageSettings ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.member.manageSettings ? '✓' : '—'}</td>
                <td className="py-2 px-3">{permissions.viewer.manageSettings ? '✓' : '—'}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </Card>
    </div>
  );
}
