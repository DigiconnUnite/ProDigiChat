'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Play,
  Webhook,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  RefreshCw,
  Globe,
  Shield,
  Zap,
  Info,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { WEBHOOK_EVENTS } from '@/lib/constants/settings';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  secret?: string;
  createdAt: string;
  lastTriggered?: string;
  updatedAt?: string;
}

interface DeliveryLog {
  id: string;
  event: string;
  webhookId: string;
  status: number;
  responseTime: number | null;
  timestamp: string;
}

interface WebhooksTabProps {
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

export function WebhooksTab({ organizationId }: WebhooksTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['message.sent', 'message.delivered']);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isTestingWebhook, setIsTestingWebhook] = useState<string | null>(null);

  // Fetch webhooks on mount
  useEffect(() => {
    fetchWebhooks();
    fetchDeliveryLogs();
  }, [organizationId]);

  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/settings/webhooks?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliveryLogs = async () => {
    try {
      const response = await fetch('/api/settings/webhooks?type=logs', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        setDeliveryLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching delivery logs:', error);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newWebhookName.trim()) {
      errors.name = 'Endpoint name is required';
    }
    
    if (!newWebhookUrl.trim()) {
      errors.url = 'URL is required';
    } else {
      try {
        new URL(newWebhookUrl);
      } catch {
        errors.url = 'Please enter a valid URL';
      }
    }
    
    if (newWebhookEvents.length === 0) {
      errors.events = 'Please select at least one event';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setNewWebhookName(webhook.name);
    setNewWebhookUrl(webhook.url);
    setNewWebhookSecret(webhook.secret || '');
    setNewWebhookEvents([...webhook.events]);
    setShowCreateForm(true);
  };

  const handleUpdateWebhook = async () => {
    if (!editingWebhook || !validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/settings/webhooks?id=${editingWebhook.id}&organizationId=${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWebhookName,
          url: newWebhookUrl,
          events: newWebhookEvents,
          secret: newWebhookSecret || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Webhook updated successfully');
        resetForm();
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update webhook');
      }
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast.error('Failed to update webhook');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewWebhookName('');
    setNewWebhookUrl('');
    setNewWebhookSecret('');
    setNewWebhookEvents(['message.sent', 'message.delivered']);
    setEditingWebhook(null);
    setShowCreateForm(false);
    setFormErrors({});
  };

  const handleDeleteWebhook = (webhookId: string) => {
    setWebhookToDelete(webhookId);
    setDeleteConfirmOpen(true);
  };

  const handleCreateWebhook = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/settings/webhooks?organizationId=${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWebhookName,
          url: newWebhookUrl,
          events: newWebhookEvents,
          secret: newWebhookSecret || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Webhook created successfully');
        resetForm();
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create webhook');
      }
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast.error('Failed to create webhook');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteWebhook = async () => {
    if (!webhookToDelete) return;

    try {
      const response = await fetch(`/api/settings/webhooks?id=${webhookToDelete}&organizationId=${organizationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Webhook deleted successfully');
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete webhook');
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook');
    } finally {
      setDeleteConfirmOpen(false);
      setWebhookToDelete(null);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setIsTestingWebhook(webhookId);
    try {
      const response = await fetch(`/api/settings/webhooks?id=${webhookId}&organizationId=${organizationId}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Webhook test completed: ${data.result.statusCode} (${data.result.responseTime}ms)`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to test webhook');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Failed to test webhook');
    } finally {
      setIsTestingWebhook(null);
    }
  };

  const toggleEvent = (event: string) => {
    setNewWebhookEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      case 'failing':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLogStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">{status} OK</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <SectionHeader 
        title="Webhooks" 
        description="Configure HTTP endpoints to receive real-time event notifications" 
      />

      {/* Webhook Endpoints Card */}
      <StyledCard
        title="Webhook Endpoints"
        description={`${webhooks.length} active endpoints`}
        titleIcon={Webhook}
        headerRight={
          <Button onClick={() => {
            resetForm();
            setShowCreateForm(true);
          }} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2">
            <Plus className="w-4 h-4 mr-2" />
            Add Endpoint
          </Button>
        }
      >

        {/* Create Webhook Form */}
        {showCreateForm && (
          <>
            <Separator className="my-6" />
            <div className="bg-green-50/30 rounded-xl border-2 border-green-950 p-5 space-y-5">
              {Object.keys(formErrors).length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    Please fix the following errors:
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {Object.values(formErrors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Endpoint Name</Label>
                  <Input
                    placeholder="e.g. CRM Integration"
                    value={newWebhookName}
                    onChange={(e) => {
                      setNewWebhookName(e.target.value);
                      if (formErrors.name) {
                        setFormErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    className={`text-sm ${formErrors.name ? 'border-red-300 focus:border-red-500' : ''}`}
                    aria-invalid={!!formErrors.name}
                    aria-describedby={formErrors.name ? 'name-error' : undefined}
                  />
                  {formErrors.name && (
                    <p id="name-error" className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">URL</Label>
                  <Input
                    type="url"
                    placeholder="https://yourapp.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => {
                      setNewWebhookUrl(e.target.value);
                      if (formErrors.url) {
                        setFormErrors(prev => ({ ...prev, url: '' }));
                      }
                    }}
                    className={`text-sm ${formErrors.url ? 'border-red-300 focus:border-red-500' : ''}`}
                    aria-invalid={!!formErrors.url}
                    aria-describedby={formErrors.url ? 'url-error' : undefined}
                  />
                  {formErrors.url && (
                    <p id="url-error" className="text-sm text-red-600 mt-1">{formErrors.url}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Events to Subscribe
                  {formErrors.events && <span className="text-red-600 ml-1">*</span>}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {WEBHOOK_EVENTS.map((event) => (
                    <label
                      key={event.id}
                      className={`flex items-center gap-3 text-sm cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                        newWebhookEvents.includes(event.id)
                          ? 'border-green-950 bg-green-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      } ${formErrors.events ? 'border-red-300' : ''}`}
                    >
                      <Checkbox
                        checked={newWebhookEvents.includes(event.id)}
                        onCheckedChange={() => {
                          toggleEvent(event.id);
                          if (formErrors.events) {
                            setFormErrors(prev => ({ ...prev, events: '' }));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {event.id}
                          {event.id.includes('message') && <MessageSquare className="h-3 w-3 text-blue-500" />}
                          {event.id.includes('campaign') && <Zap className="h-3 w-3 text-purple-500" />}
                          {event.id.includes('contact') && <Globe className="h-3 w-3 text-green-500" />}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{event.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {formErrors.events && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.events}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  Secret Key (optional)
                </Label>
                <Input
                  type="password"
                  placeholder="Used to sign webhook payloads"
                  value={newWebhookSecret}
                  onChange={(e) => setNewWebhookSecret(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a signature header with each webhook request so you can verify it's from us.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={editingWebhook ? handleUpdateWebhook : handleCreateWebhook} 
                  disabled={isSaving} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingWebhook ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      {editingWebhook ? (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Update Endpoint
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Endpoint
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button 
                  onClick={resetForm}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Webhooks Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading webhooks...</span>
            </div>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12">
            <Webhook className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Create your first webhook to start receiving real-time event notifications from your WhatsApp campaigns.
            </p>
            <Button 
              onClick={() => setShowCreateForm(true)} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Webhook
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-green-950">
            <table className="w-full">
              <thead>
                <tr className="bg-green-950">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">URL</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Events</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Last Triggered</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{webhook.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{webhook.url}</code>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs bg-gray-100 border-gray-200">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-gray-100 border-gray-200">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(webhook.status)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {webhook.lastTriggered ? formatDate(webhook.lastTriggered) : 'Never'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleTestWebhook(webhook.id)} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          disabled={isTestingWebhook === webhook.id}
                        >
                          {isTestingWebhook === webhook.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              Test
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleEditWebhook(webhook)} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteWebhook(webhook.id)} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StyledCard>

      {/* Delivery Logs Card */}
      <StyledCard
        title="Delivery Logs"
        description="Recent webhook delivery attempts"
        titleIcon={Clock}
      >
        {deliveryLogs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">No delivery logs available</p>
            <p className="text-xs text-gray-400 mt-1">Logs will appear here once webhooks are triggered</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-green-950">
            <table className="w-full">
              <thead>
                <tr className="bg-green-950">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Event</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Endpoint</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Response Time</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {deliveryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{log.event}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {webhooks.find(w => w.id === log.webhookId)?.name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      {getLogStatusBadge(log.status)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {log.responseTime && (
                          <>
                            <RefreshCw className="h-3 w-3 text-gray-400" />
                            {log.responseTime}ms
                          </>
                        )}
                        {!log.responseTime && '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StyledCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Webhook
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteWebhook}
            >
              Delete Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
