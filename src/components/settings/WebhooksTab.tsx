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
      const response = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
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
      const response = await fetch(`/api/settings/webhooks?id=${webhookId}`, {
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
      const response = await fetch(`/api/settings/webhooks?id=${webhookId}`, {
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
      {/* Webhook Endpoints Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Endpoints
              </CardTitle>
              <CardDescription>
                {webhooks.length} active endpoints
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Webhook Form */}
          {showCreateForm && (
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="webhook-name">Endpoint Name</Label>
                  <Input
                    id="webhook-name"
                    placeholder="e.g. CRM Integration"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://yourapp.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Events to Subscribe</Label>
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
              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Secret Key (optional)</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  placeholder="Used to sign payloads"
                  value={newWebhookSecret}
                  onChange={(e) => setNewWebhookSecret(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateWebhook} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Endpoint'
                  )}
                </Button>
                <Button onClick={() => setShowCreateForm(false)} variant="outline" size="sm">
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.name}</TableCell>
                      <TableCell>
                        <code className="text-sm font-mono">{webhook.url}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.slice(0, 2).map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                          {webhook.events.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{webhook.events.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(webhook.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {webhook.lastTriggered ? formatDate(webhook.lastTriggered) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleTestWebhook(webhook.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteWebhook(webhook.id)}
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

      {/* Delivery Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Logs</CardTitle>
          <CardDescription>Recent webhook delivery attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.event}</TableCell>
                    <TableCell>
                      {webhooks.find(w => w.id === log.webhookId)?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{getLogStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.responseTime ? `${log.responseTime}ms` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
