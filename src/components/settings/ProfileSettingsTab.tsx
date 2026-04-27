'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Save, 
  User, 
  Shield, 
  Camera,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  organizationRole?: string;
  organizationName?: string;
  createdAt: string;
}

interface ProfileSettingsTabProps {
  organizationId: string;
}

export function ProfileSettingsTab({ organizationId }: ProfileSettingsTabProps) {
  const { data: session, update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'sms'>('totp');
  const [smsBackupEnabled, setSmsBackupEnabled] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [organizationId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        toast.success('Profile updated successfully');
        // Update session
        await updateSession({ user: data.user });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>Manage your personal account details and password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4 pb-6 border-b">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xl font-bold">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                getInitials(profile?.name || 'User')
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">{profile?.name}</div>
              <div className="text-sm text-muted-foreground">
                {profile?.organizationRole && (
                  <span className="capitalize">{profile.organizationRole}</span>
                )}{' '}
                · {profile?.organizationName || 'Member'}
              </div>
              <div className="flex gap-2 mt-2">
                {profile?.organizationRole && (
                  <Badge className={getRoleBadgeColor(profile.organizationRole)} variant="outline">
                    {profile.organizationRole.charAt(0).toUpperCase() + profile.organizationRole.slice(1)}
                  </Badge>
                )}
                {profile?.role === 'admin' && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200" variant="outline">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Change Photo
            </Button>
          </div>

          {/* Profile Form */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Role / Designation</Label>
              <Input
                id="profile-role"
                value={profile?.organizationRole || 'Member'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Use a strong password with at least 8 characters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded ${
                      getPasswordStrength(newPassword) >= level
                        ? level <= 2
                          ? 'bg-red-500'
                          : level <= 3
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Password strength:{' '}
                {getPasswordStrength(newPassword) <= 2
                  ? ' Weak'
                  : getPasswordStrength(newPassword) <= 3
                  ? ' Fair'
                  : ' Strong'}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">Enable 2FA via Authenticator App</div>
              <div className="text-sm text-muted-foreground">
                Use Google Authenticator or Authy to generate OTP codes
              </div>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">SMS OTP Backup</div>
              <div className="text-sm text-muted-foreground">
                Receive backup codes via SMS if authenticator is unavailable
              </div>
            </div>
            <Switch
              checked={smsBackupEnabled}
              onCheckedChange={setSmsBackupEnabled}
              disabled={!twoFactorEnabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
