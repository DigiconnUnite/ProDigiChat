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
    autoDeleteContacts: boolean;
    autoDeleteMessages: boolean;
    autoDeleteCampaigns: boolean;
    autoDeleteLogs: boolean;
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
    rightToDeletion: false,
    rightToPortability: false,
    dataRetention: {
      contacts: 365,
      messages: 365,
      campaigns: 365,
      logs: 90,
      autoDeleteContacts: false,
      autoDeleteMessages: false,
      autoDeleteCampaigns: false,
      autoDeleteLogs: false,
    },
    thirdPartySharing: {
      analytics: false,
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
      const response = await fetch(`/api/settings/privacy?organizationId=${organizationId}`);
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
      const response = await fetch(`/api/settings/privacy?organizationId=${organizationId}`, {
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
      const response = await fetch(`/api/settings/privacy?organizationId=${organizationId}`, {
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
      const response = await fetch(`/api/settings/privacy?organizationId=${organizationId}`, {
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
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Privacy & GDPR</h2>
        <p className="text-sm text-gray-500 mt-1">Manage data compliance, consent, and retention policies</p>
      </div>

      {/* GDPR Compliance Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">GDPR Compliance</h3>
        <p className="text-sm text-gray-500 mb-4">Configure settings required for GDPR compliance</p>
        
        <div className="space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Enable GDPR Mode</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Enforce data rights, consent requirements, and DPO assignments
              </div>
            </div>
            <Switch
              checked={privacySettings.gdprMode}
              onCheckedChange={(checked) =>
                setPrivacySettings({ ...privacySettings, gdprMode: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Require Explicit Consent</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Contacts must explicitly opt-in before receiving messages
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
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Double Opt-In</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Send confirmation message before adding contact to campaigns
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
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Right to Deletion</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Allow contacts to request permanent removal of their data
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
              <div className="text-sm font-medium text-gray-900">Right to Portability</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Allow contacts to export their data
              </div>
            </div>
            <Switch
              checked={privacySettings.rightToPortability}
              onCheckedChange={(checked) =>
                setPrivacySettings({ ...privacySettings, rightToPortability: checked })
              }
            />
          </div>
        </div>
        
        <div className="border-t border-gray-200 my-4"></div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Data Protection Officer (DPO) Email</Label>
            <Input
              type="email"
              value={privacySettings.dpoEmail}
              onChange={(e) =>
                setPrivacySettings({ ...privacySettings, dpoEmail: e.target.value })
              }
              placeholder="dpo@company.com"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">GDPR Data Retention (days)</Label>
            <Input
              type="number"
              value={privacySettings.retentionPeriod}
              onChange={(e) =>
                setPrivacySettings({
                  ...privacySettings,
                  retentionPeriod: parseInt(e.target.value) || 0,
                })
              }
              min="30"
              className="text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Data Retention Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Data Retention Policy</h3>
        <p className="text-sm text-gray-500 mb-4">Automatically delete data after specified retention period</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-900">Contacts</span>
            <div className="flex items-center gap-2">
              <Input
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
                className="w-20 text-sm h-8"
              />
              <span className="text-xs text-gray-500">days</span>
              <Switch
                checked={privacySettings.dataRetention.autoDeleteContacts}
                onCheckedChange={(checked) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      autoDeleteContacts: checked,
                    },
                  })
                }
                className="scale-75"
              />
              <span className="text-xs text-gray-600">Auto-delete</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-900">Messages</span>
            <div className="flex items-center gap-2">
              <Input
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
                className="w-20 text-sm h-8"
              />
              <span className="text-xs text-gray-500">days</span>
              <Switch
                checked={privacySettings.dataRetention.autoDeleteMessages}
                onCheckedChange={(checked) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      autoDeleteMessages: checked,
                    },
                  })
                }
                className="scale-75"
              />
              <span className="text-xs text-gray-600">Auto-delete</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-900">Campaigns</span>
            <div className="flex items-center gap-2">
              <Input
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
                className="w-20 text-sm h-8"
              />
              <span className="text-xs text-gray-500">days</span>
              <Switch
                checked={privacySettings.dataRetention.autoDeleteCampaigns}
                onCheckedChange={(checked) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      autoDeleteCampaigns: checked,
                    },
                  })
                }
                className="scale-75"
              />
              <span className="text-xs text-gray-600">Auto-delete</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-900">Activity Logs</span>
            <div className="flex items-center gap-2">
              <Input
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
                className="w-20 text-sm h-8"
              />
              <span className="text-xs text-gray-500">days</span>
              <Switch
                checked={privacySettings.dataRetention.autoDeleteLogs}
                onCheckedChange={(checked) =>
                  setPrivacySettings({
                    ...privacySettings,
                    dataRetention: {
                      ...privacySettings.dataRetention,
                      autoDeleteLogs: checked,
                    },
                  })
                }
                className="scale-75"
              />
              <span className="text-xs text-gray-600">Auto-delete</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Third-Party Sharing Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Third-Party Data Sharing</h3>
        <p className="text-sm text-gray-500 mb-4">Control how data is shared with external services</p>
        
        <div className="space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Analytics Tracking</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Allow anonymized analytics for platform improvement
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
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Third-Party Integrations</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Share data with connected CRM or marketing tools
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
              <div className="text-sm font-medium text-gray-900">Advertising Data</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Allow use of data for targeted advertising purposes
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
        </div>
      </Card>

      {/* Data Export Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Data Export</h3>
        <p className="text-sm text-gray-500 mb-4">Export all organization data in compliance with portability rights</p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">Include Media</Label>
            <Select value={includeMedia ? 'yes' : 'no'} onValueChange={(v) => setIncludeMedia(v === 'yes')}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleExportData} size="sm" className="text-xs px-3 py-1.5">
            Request Data Export
          </Button>
        </div>
      </Card>

      {/* Save Bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between -mx-6 px-6 mt-6">
        <span className="text-sm text-gray-500">Privacy settings are legally binding — review before saving</span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs px-4 py-2"
            onClick={() => {
              fetchPrivacySettings()
            }}
          >
            Discard
          </Button>
          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              'Save Privacy Settings'
            )}
          </Button>
        </div>
      </div>

    </div>
  );
}
