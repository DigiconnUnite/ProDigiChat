'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Loader2, 
  ShieldCheck,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface PrivacySettings {
  gdprMode: boolean;
  explicitConsent: boolean;
  doubleOptIn: boolean;
  rightToDeletion: boolean;
  rightToPortability: boolean;
  dataRetention: {
    contacts: number;
    messages: number;
    campaigns: number;
    logs: number;
  };
  thirdPartySharing: {
    analytics: boolean;
    integrations: boolean;
    advertising: boolean;
  };
  dpoEmail: string;
  retentionPeriod: number;
}

interface PrivacySettingsTabProps {
  organizationId: string;
}

export function PrivacySettingsTab({ organizationId }: PrivacySettingsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    gdprMode: false,
    explicitConsent: false,
    doubleOptIn: false,
    rightToDeletion: true,
    rightToPortability: true,
    dataRetention: {
      contacts: 365,
      messages: 90,
      campaigns: 365,
      logs: 30,
    },
    thirdPartySharing: {
      analytics: true,
      integrations: false,
      advertising: false,
    },
    dpoEmail: '',
    retentionPeriod: 365,
  });

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [includeMedia, setIncludeMedia] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteEntityType, setDeleteEntityType] = useState('all');

  // Fetch privacy settings on mount
  useEffect(() => {
    fetchPrivacySettings();
  }, [organizationId]);

  const fetchPrivacySettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/privacy');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setPrivacySettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: privacySettings,
        }),
      });

      if (response.ok) {
        toast.success('Privacy settings saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save privacy settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFormat,
          includeMedia,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Data export request submitted. Estimated completion: 15 minutes`);
        setShowExportDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to request data export');
      }
    } catch (error) {
      console.error('Error requesting data export:', error);
      toast.error('Failed to request data export');
    }
  };

  const handleDeleteData = async () => {
    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          entityType: deleteEntityType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Data deletion request submitted. Scheduled for 30 days from now`);
        setShowDeleteDialog(false);
        setDeleteConfirmation('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to request data deletion');
      }
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      toast.error('Failed to request data deletion');
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
      {/* GDPR Compliance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            GDPR Compliance
          </CardTitle>
          <CardDescription>Configure GDPR compliance settings for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">Enable GDPR Mode</div>
              <div className="text-sm text-muted-foreground">
                Activate GDPR compliance features across the platform
              </div>
            </div>
            <Switch
              checked={privacySettings.gdprMode}
              onCheckedChange={(checked) =>
                setPrivacySettings({ ...privacySettings, gdprMode: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">Explicit Consent Required</div>
              <div className="text-sm text-muted-foreground">
                Require explicit consent from contacts before processing their data
              </div>
            </div>
            <Switch
              checked={privacySettings.explicitConsent}
              onCheckedChange={(checked) =>
                setPrivacySettings({ ...privacySettings, explicitConsent: checked })
              }
              disabled={!privacySettings.gdprMode}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">Double Opt-In</div>
              <div className="text-sm text-muted-foreground">
                Require email confirmation for new contact signups
              </div>
            </div>
            <Switch
              checked={privacySettings.doubleOptIn}
              onCheckedChange={(checked) =>
                setPrivacySettings({ ...privacySettings, doubleOptIn: checked })
              }
              disabled={!privacySettings.gdprMode}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">Right to Deletion</div>
              <div className="text-sm text-muted-foreground">
                Allow users to request deletion of their personal data
              </div>
            </div>
            <Switch
              checked={privacySettings.rightToDeletion}
              onCheckedChange={(checked) =>
                setPrivacySettings({ ...privacySettings, rightToDeletion: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <div className="font-medium">Right to Portability</div>
              <div className="text-sm text-muted-foreground">
                Allow users to export their data in a machine-readable format
              </div>
            </div>
            <Switch
              checked={privacySettings.rightToPortability}
              onCheckedChange={(checked) =>
                setPrivacySettings({ ...privacySettings, rightToPortability: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Retention Card */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention Policies</CardTitle>
          <CardDescription>Configure how long different types of data are stored</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contacts-retention">Contacts (days)</Label>
              <Input
                id="contacts-retention"
                type="number"
                value={privacySettings.dataRetention.contacts}
                onChange={(e) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      contacts: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="messages-retention">Messages (days)</Label>
              <Input
                id="messages-retention"
                type="number"
                value={privacySettings.dataRetention.messages}
                onChange={(e) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      messages: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaigns-retention">Campaigns (days)</Label>
              <Input
                id="campaigns-retention"
                type="number"
                value={privacySettings.dataRetention.campaigns}
                onChange={(e) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      campaigns: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logs-retention">Activity Logs (days)</Label>
              <Input
                id="logs-retention"
                type="number"
                value={privacySettings.dataRetention.logs}
                onChange={(e) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      logs: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third-Party Sharing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Third-Party Data Sharing</CardTitle>
          <CardDescription>Control how your data is shared with third parties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">Analytics Services</div>
              <div className="text-sm text-muted-foreground">
                Share anonymized usage data with analytics providers
              </div>
            </div>
            <Switch
              checked={privacySettings.thirdPartySharing.analytics}
              onCheckedChange={(checked) =>
                setPrivacySettings({
                  ...privacySettings,
                  thirdPartySharing: {
                    ...privacySettings.thirdPartySharing,
                    analytics: checked,
                  },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="font-medium">Third-Party Integrations</div>
              <div className="text-sm text-muted-foreground">
                Allow data sharing with connected third-party apps
              </div>
            </div>
            <Switch
              checked={privacySettings.thirdPartySharing.integrations}
              onCheckedChange={(checked) =>
                setPrivacySettings({
                  ...privacySettings,
                  thirdPartySharing: {
                    ...privacySettings.thirdPartySharing,
                    integrations: checked,
                  },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <div className="font-medium">Advertising</div>
              <div className="text-sm text-muted-foreground">
                Allow use of data for personalized advertising
              </div>
            </div>
            <Switch
              checked={privacySettings.thirdPartySharing.advertising}
              onCheckedChange={(checked) =>
                setPrivacySettings({
                  ...privacySettings,
                  thirdPartySharing: {
                    ...privacySettings.thirdPartySharing,
                    advertising: checked,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* DPO Contact Card */}
      <Card>
        <CardHeader>
          <CardTitle>Data Protection Officer</CardTitle>
          <CardDescription>Contact information for privacy-related inquiries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dpo-email">DPO Email</Label>
              <Input
                id="dpo-email"
                type="email"
                value={privacySettings.dpoEmail}
                onChange={(e) =>
                  setPrivacySettings({ ...privacySettings, dpoEmail: e.target.value })
                }
                placeholder="dpo@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention-period">Default Retention Period (days)</Label>
              <Input
                id="retention-period"
                type="number"
                value={privacySettings.retentionPeriod}
                onChange={(e) =>
                  setPrivacySettings({
                    ...privacySettings,
                    retentionPeriod: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Privacy Settings'
          )}
        </Button>
      </div>

      {/* Data Export Card */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>Request a copy of all your organization's data</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Request Data Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Data Export</DialogTitle>
                <DialogDescription>
                  Choose the format and options for your data export
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="export-format">Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger id="export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-media"
                    checked={includeMedia}
                    onChange={(e) => setIncludeMedia(e.target.checked)}
                  />
                  <Label htmlFor="include-media">Include media files (images, attachments)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Request Export
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Data Deletion Card */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Data Deletion
          </CardTitle>
          <CardDescription>
            Permanently delete your organization's data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Request Data Deletion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Confirm Data Deletion</DialogTitle>
                <DialogDescription>
                  This will permanently delete all data for your organization. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-entity">Entity Type</Label>
                  <Select value={deleteEntityType} onValueChange={setDeleteEntityType}>
                    <SelectTrigger id="delete-entity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Data</SelectItem>
                      <SelectItem value="contacts">Contacts Only</SelectItem>
                      <SelectItem value="messages">Messages Only</SelectItem>
                      <SelectItem value="campaigns">Campaigns Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation">
                    Type "DELETE" to confirm
                  </Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteData}
                  disabled={deleteConfirmation !== 'DELETE'}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Data
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
