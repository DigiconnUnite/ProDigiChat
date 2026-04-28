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
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Play,
  Webhook,
  AlertCircle,
  CheckCircle,
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
      const response = await fetch('/api/settings/webhooks', { method: 'OPTIONS' });
      if (response.ok) {
        const data = await response.json();
        setDeliveryLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching delivery logs:', error);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookName || !newWebhookUrl) {
      toast.error('Please enter webhook name and URL');
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
        setNewWebhookName('');
        setNewWebhookUrl('');
        setNewWebhookSecret('');
        setNewWebhookEvents(['message.sent', 'message.delivered']);
        setShowCreateForm(false);
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

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/webhooks?id=${webhookId}&organizationId=${organizationId}`, {
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
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
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
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Webhooks</h2>
        <p className="text-sm text-gray-500 mt-1">Configure HTTP endpoints to receive real-time event notifications</p>
      </div>

      {/* Webhook Endpoints Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Webhook Endpoints</h3>
            <p className="text-sm text-gray-500 mt-0.5">{webhooks.length} active endpoints</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2">
            <Plus className="w-4 h-4 mr-2" />
            Add Endpoint
          </Button>
        </div>

        {/* Create Webhook Form */}
        {showCreateForm && (
          <div className="bg-gray-50 rounded-md p-4 mb-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Endpoint Name</Label>
                <Input
                  placeholder="e.g. CRM Integration"
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">URL</Label>
                <Input
                  type="url"
                  placeholder="https://yourapp.com/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">Events to Subscribe</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={newWebhookEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    {event.id}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">Secret Key (optional)</Label>
              <Input
                type="password"
                placeholder="Used to sign payloads"
                value={newWebhookSecret}
                onChange={(e) => setNewWebhookSecret(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateWebhook} disabled={isSaving} size="sm" className="text-xs px-3 py-1.5">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Endpoint'
                )}
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline" size="sm" className="text-xs px-3 py-1.5">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Webhooks Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Name</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">URL</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Events</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Last Triggered</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <span className="font-medium text-gray-900">{webhook.name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <code className="text-xs font-mono text-gray-600">{webhook.url}</code>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <Badge key={event} variant="outline" className="text-xs bg-gray-100">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="outline" className="text-xs bg-gray-100">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {getStatusBadge(webhook.status)}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-600">
                    {webhook.lastTriggered ? formatDate(webhook.lastTriggered) : 'Never'}
                  </td>
                  <td className="py-3 px-3">
                    <Button 
                      onClick={() => handleTestWebhook(webhook.id)} 
                      variant="outline" 
                      size="sm" 
                      className="text-xs px-3 py-1.5"
                    >
                      Test
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Delivery Logs Card */}
      <Card className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Delivery Logs</h3>
        <p className="text-sm text-gray-500 mb-4">Recent webhook delivery attempts</p>
        
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Event</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Endpoint</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Status</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Response</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50">Time</th>
            </tr>
          </thead>
          <tbody>
            {deliveryLogs.map((log) => (
              <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2 px-3 font-medium text-gray-900">{log.event}</td>
                <td className="py-2 px-3">
                  {webhooks.find(w => w.id === log.webhookId)?.name || 'Unknown'}
                </td>
                <td className="py-2 px-3">
                  {getLogStatusBadge(log.status)}
                </td>
                <td className="py-2 px-3 text-xs text-gray-600">
                  {log.responseTime ? `${log.responseTime}ms` : '—'}
                </td>
                <td className="py-2 px-3 text-xs text-gray-600">
                  {formatDate(log.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
