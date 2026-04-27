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
      const response = await fetch(`/api/settings/team?id=${memberId}`, {
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
      const response = await fetch(`/api/settings/team?id=${memberId}`, {
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
      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                {members.length} of 10 seats used on Professional plan
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteForm(!showInviteForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite Form */}
          {showInviteForm && (
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="team@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger id="invite-role">
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
                <Button onClick={handleInvite} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowInviteForm(false)} variant="outline" size="sm">
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-medium text-sm">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              getInitials(member.name)
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)} variant="outline">
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(member.status)} variant="outline">
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {member.lastActive ? formatDate(member.lastActive) : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {member.status === 'invited' && (
                            <Button
                              onClick={() => handleResendInvite(member.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setEditingMember(member);
                                  setEditRole(member.role);
                                }}
                              >
                                <Edit className="h-4 w-4" />
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
                          <Button
                            onClick={() => handleRemoveMember(member.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>What each role can do in ProDigiChat</CardDescription>
        </CardHeader>
        <CardContent>
          {permissions ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Viewer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Manage billing</TableCell>
                    <TableCell>{permissions.owner.manageBilling ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.admin.manageBilling ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.manager.manageBilling ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.member.manageBilling ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.viewer.manageBilling ? '✓' : '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Manage team</TableCell>
                    <TableCell>{permissions.owner.manageTeam ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.admin.manageTeam ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.manager.manageTeam ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.member.manageTeam ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.viewer.manageTeam ? '✓' : '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Create campaigns</TableCell>
                    <TableCell>{permissions.owner.createCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.admin.createCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.manager.createCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.member.createCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.viewer.createCampaigns ? '✓' : '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Launch campaigns</TableCell>
                    <TableCell>{permissions.owner.launchCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.admin.launchCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.manager.launchCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.member.launchCampaigns ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.viewer.launchCampaigns ? '✓' : '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Manage contacts</TableCell>
                    <TableCell>{permissions.owner.manageContacts ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.admin.manageContacts ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.manager.manageContacts ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.member.manageContacts ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.viewer.manageContacts ? '✓' : '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">View analytics</TableCell>
                    <TableCell>{permissions.owner.viewAnalytics ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.admin.viewAnalytics ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.manager.viewAnalytics ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.member.viewAnalytics ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.viewer.viewAnalytics ? '✓' : '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Manage settings</TableCell>
                    <TableCell>{permissions.owner.manageSettings ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.admin.manageSettings ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.manager.manageSettings ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.member.manageSettings ? '✓' : '—'}</TableCell>
                    <TableCell>{permissions.viewer.manageSettings ? '✓' : '—'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
