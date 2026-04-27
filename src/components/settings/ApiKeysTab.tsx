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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw,
  Key,
  AlertTriangle,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_KEY_SCOPES } from '@/lib/constants/settings';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  fullKey?: string;
  scopes: string[];
  rateLimit: number;
  maxRequests: number | null;
  requestCount: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ApiKeysTabProps {
  organizationId: string;
}

export function ApiKeysTab({ organizationId }: ApiKeysTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('never');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['campaigns:read', 'contacts:read']);
  const [generatedKey, setGeneratedKey] = useState<ApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch API keys
  useEffect(() => {
    fetchApiKeys();
  }, [organizationId]);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/settings/api-keys?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName) {
      toast.error('Please enter a key name');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: newKeyName,
          scopes: newKeyScopes,
          expiry: newKeyExpiry === 'never' ? null : newKeyExpiry,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedKey(data.apiKey);
        toast.success('API key generated successfully');
        setNewKeyName('');
        setNewKeyExpiry('never');
        setNewKeyScopes(['campaigns:read', 'contacts:read']);
        setShowCreateForm(false);
        fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate API key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to generate API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('API key revoked successfully');
        fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to revoke API key');
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const handleRegenerateKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to regenerate this API key? The old key will stop working immediately.')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/api-keys?id=${keyId}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedKey(data.apiKey);
        toast.success('API key regenerated successfully');
        fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to regenerate API key');
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
      toast.error('Failed to regenerate API key');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatLastUsed = (dateString: string | null) => {
    if (!dateString) return 'Never';
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

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(16);
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-secondary/50 border-l-4 border-green-500 rounded-r-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Keep your API keys secret. Never share them publicly or commit them to version control.
          </div>
        </div>
      </div>

      {/* API Keys Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Active Keys
              </CardTitle>
              <CardDescription>
                {apiKeys.length} of 5 keys used
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Key Form */}
          {showCreateForm && (
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-expiry">Expiry</Label>
                  <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                    <SelectTrigger id="key-expiry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(API_KEY_SCOPES).map((scope) => (
                    <label
                      key={scope}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={newKeyScopes.includes(scope)}
                        onCheckedChange={() => toggleScope(scope)}
                      />
                      {scope}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateKey} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
                <Button onClick={() => setShowCreateForm(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Keys Table */}
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
                    <TableHead>Key</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <span>{maskKey(key.prefix)}</span>
                          <Button
                            onClick={() => handleCopyKey(key.fullKey || key.prefix)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {copiedKey === (key.fullKey || key.prefix) ? (
                              <Copy className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.slice(0, 2).map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                          {key.scopes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{key.scopes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastUsed(key.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(key.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleRegenerateKey(key.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleRevokeKey(key.id)}
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

      {/* API Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle>API Reference</CardTitle>
          <CardDescription>Base URL and quick reference for the REST API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between">
            <code className="font-mono text-sm">https://prodigichat.com/api/v1</code>
            <Button
              onClick={() => handleCopyKey('https://prodigichat.com/api/v1')}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              View API Docs
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Postman Collection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Key Dialog */}
      {generatedKey && (
        <Dialog open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Generated</DialogTitle>
              <DialogDescription>
                Copy this key now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <code className="font-mono text-sm break-all">{generatedKey.fullKey}</code>
              </div>
              <Button
                onClick={() => handleCopyKey(generatedKey.fullKey || '')}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setGeneratedKey(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
