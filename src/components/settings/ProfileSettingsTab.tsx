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
      const response = await fetch(`/api/settings/profile?organizationId=${organizationId}`);
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
      const response = await fetch(`/api/settings/profile?organizationId=${organizationId}`, {
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
      const response = await fetch(`/api/settings/profile?organizationId=${organizationId}`, {
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
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Profile Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your personal account details and password</p>
      </div>

      {/* Profile Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        {/* Profile Header */}
        <div className="flex items-center gap-4 pb-5 border-b border-gray-200">
          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-18 h-18 rounded-full object-cover" />
            ) : (
              getInitials(profile?.name || 'User')
            )}
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold">{profile?.name}</div>
            <div className="text-sm text-gray-500">
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
          <Button variant="outline" size="sm" className="ml-auto">
            Change Photo
          </Button>
        </div>

        {/* Profile Form */}
        <div className="grid gap-4 md:grid-cols-2 mt-5">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9XXXXXXXXX"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Role / Designation</Label>
            <Input
              value={profile?.organizationRole || 'Member'}
              disabled
              className="bg-gray-50 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Change Password Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Change Password</h3>
        <p className="text-sm text-gray-500 mb-4">Use a strong password with at least 8 characters</p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="text-sm"
            />
          </div>
        </div>

        {/* Password Strength Indicator */}
        {newPassword && (
          <div className="space-y-2 mt-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
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
            <div className="text-xs text-gray-400">
              Password strength: {getPasswordStrength(newPassword) <= 2 ? 'Fair' : 'Strong'}
            </div>
          </div>
        )}
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500 mb-4">Add an extra layer of security to your account</p>
        
        <div className="space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Enable 2FA via Authenticator App</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Use Google Authenticator or Authy to generate OTP codes
              </div>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">SMS OTP Backup</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Receive backup codes via SMS if authenticator is unavailable
              </div>
            </div>
            <Switch
              checked={smsBackupEnabled}
              onCheckedChange={setSmsBackupEnabled}
              disabled={!twoFactorEnabled}
            />
          </div>
        </div>
      </Card>

      {/* Save Bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between -mx-6 px-6 mt-6">
        <span className="text-sm text-gray-500">Your profile is visible to your team</span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs px-4 py-2"
            onClick={() => {
              if (profile) {
                setName(profile.name || '')
                setEmail(profile.email || '')
                setPhone((profile as any)?.phone || '')
              }
            }}
          >
            Discard
          </Button>
          <Button 
            onClick={handleSaveProfile} 
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
