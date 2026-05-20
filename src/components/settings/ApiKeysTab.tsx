'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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
  Check,
  X,
  Shield,
  Zap,
  Clock,
  Globe,
  BookOpen,
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

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ApiKeysTab({ organizationId }: ApiKeysTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('never');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['campaigns:read', 'contacts:read']);
  const [generatedKey, setGeneratedKey] = useState<ApiKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      const response = await fetch(`/api/settings/api-keys?organizationId=${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      const response = await fetch(`/api/settings/api-keys?id=${keyId}&organizationId=${organizationId}`, {
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
      const response = await fetch(`/api/settings/api-keys?id=${keyId}&organizationId=${organizationId}`, {
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

  const handleCopyKey = (key: string, id?: string) => {
    navigator.clipboard.writeText(key);
    if (id) setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(16);
  };

  const getExpiryBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">No expiry</Badge>;
    }
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Expired</Badge>;
    }
    if (diffDays <= 7) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{diffDays}d left</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">{formatDate(expiresAt)}</Badge>;
  };

  const activeKeys = apiKeys.filter(k => k.isActive);
  const expiredKeys = apiKeys.filter(k => !k.isActive);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold mb-1">API Keys</h1>
        <p className="text-muted-foreground text-lg">Manage access keys for integrating with external systems</p>
      </div>

      {/* Security Notice */}
      <div className="p-4 rounded-xl border-2 border-green-300 bg-white">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-800">Keep your API keys secret</h4>
            <p className="text-xs text-green-700 mt-0.5">
              Never share your keys publicly or commit them to version control. Use environment variables on your server.
            </p>
          </div>
        </div>
      </div>

      {/* Active Keys */}
      <StyledCard
        title="Active Keys"
        description={`${activeKeys.length} of 5 keys used`}
        headerRight={
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`rounded-lg text-sm transition-all ${showCreateForm
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
          >
            {showCreateForm ? 'Cancel' : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Generate Key
              </>
            )}
          </Button>
        }
      >

        {/* Create Key Form */}
        {showCreateForm && (
          <div className="p-5 rounded-xl border-2 border-green-950 bg-green-50/30 mb-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-semibold text-foreground">Generate New API Key</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="key-name" className="text-sm font-medium text-foreground">
                  Key Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="key-name"
                    placeholder="e.g. Production App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="pl-10 text-sm rounded-lg border-slate-300"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-expiry" className="text-sm font-medium text-foreground">Expiry</Label>
                <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                  <SelectTrigger id="key-expiry" className="text-sm rounded-lg border-slate-300">
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

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Scopes</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(API_KEY_SCOPES).map((scope) => (
                  <label
                    key={scope}
                    className={`flex items-center gap-2.5 text-xs cursor-pointer p-2.5 rounded-lg border-2 transition-all ${newKeyScopes.includes(scope)
                        ? 'border-green-950 bg-green-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <Checkbox
                      checked={newKeyScopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <span className="font-mono text-muted-foreground">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={handleCreateKey}
                disabled={isSaving || !newKeyName}
                className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Generate Key
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Keys List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeKeys.length === 0 && !showCreateForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center mb-4">
              <Key className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No API keys yet</p>
            <p className="text-xs text-muted-foreground mt-1">Generate your first key to start integrating</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-green-950/40 transition-all group"
              >
                {/* Icon */}
                <div className="h-11 w-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Key className="h-5 w-5 text-green-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{key.name}</span>
                    {getExpiryBadge(key.expiresAt)}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <code className="text-xs font-mono text-muted-foreground bg-slate-50 px-2 py-0.5 rounded">
                      {maskKey(key.prefix)}
                    </code>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatLastUsed(key.lastUsedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {key.scopes.slice(0, 3).map((scope) => (
                      <Badge key={scope} className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-mono">
                        {scope}
                      </Badge>
                    ))}
                    {key.scopes.length > 3 && (
                      <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-xs">
                        +{key.scopes.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    onClick={() => handleCopyKey(key.fullKey || key.prefix, key.id)}
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-slate-300 text-xs h-8"
                  >
                    {copiedId === key.id ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleRegenerateKey(key.id)}
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-slate-300 text-xs h-8"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => handleRevokeKey(key.id)}
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs h-8"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </StyledCard>

      {/* Expired Keys */}
      {expiredKeys.length > 0 && (
        <StyledCard>
          <SectionHeader
            title="Expired Keys"
            description="These keys are no longer valid and cannot be used"
          />
          <div className="space-y-2">
            {expiredKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 opacity-60"
              >
                <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Key className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{key.name}</span>
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Expired</Badge>
                  </div>
                  <code className="text-xs font-mono text-slate-400 mt-1 block">
                    {maskKey(key.prefix)}
                  </code>
                </div>
                <Button
                  onClick={() => handleRevokeKey(key.id)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-red-200 text-red-500 hover:bg-red-50 text-xs h-8"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </StyledCard>
      )}

      {/* API Reference */}
      <StyledCard>
        <SectionHeader
          title="API Reference"
          description="Base URL and quick reference for the REST API"
        />

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Globe className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Base URL</p>
              <code className="text-sm text-slate-100 font-mono">https://prodigichat.com/api/v1</code>
            </div>
          </div>
          <Button
            onClick={() => handleCopyKey('https://prodigichat.com/api/v1')}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg h-8"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-sm">
            <BookOpen className="w-4 h-4 mr-2" />
            View API Docs
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Postman Collection
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-sm">
            <FileText className="w-4 h-4 mr-2" />
            OpenAPI Spec
          </Button>
        </div>
      </StyledCard>

      {/* Usage Guide */}
      <StyledCard>
        <SectionHeader
          title="Quick Start"
          description="How to use your API key"
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Zap className="w-4 h-4 text-green-500" />
              Example Request
            </h4>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs overflow-x-auto">
              <p className="text-slate-400">
                <span className="text-green-400">curl</span> -X POST {'"'}https://prodigichat.com/api/v1/campaigns{'"'} \
              </p>
              <p className="text-slate-400 mt-1">
                {'  '}-H {'"'}Authorization: Bearer {'<'}your-api-key{'>'}{'"'} \
              </p>
              <p className="text-slate-400">
                {'  '}-H {'"'}Content-Type: application/json{'"'} \
              </p>
              <p className="text-slate-300">
                {'  '}-d {'"'}{'{"name":"My Campaign","template":"hello_world"}'}{'"'}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Shield className="w-4 h-4 text-green-500" />
              Authentication
            </h4>
            <p className="text-xs text-muted-foreground">
              Include your API key in the <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-foreground">Authorization</code> header with the <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-foreground">Bearer</code> prefix. All requests must be made over HTTPS.
            </p>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Rate Limits
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
              <li>100 requests per minute per key</li>
              <li>1,000 requests per hour per key</li>
              <li>Rate limit info is included in response headers</li>
              <li>Exceeding limits returns HTTP 429 with retry-after header</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-green-950 border border-green-800">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-400" />
            Need More Help?
          </h4>
          <p className="text-xs text-gray-300 mt-1.5">
            Check our full API documentation for detailed endpoint references, SDKs, and integration guides.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-lg border-green-700 text-green-400 hover:bg-green-900 hover:text-green-300 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Read Full Documentation
          </Button>
        </div>
      </StyledCard>

      {/* Generated Key Dialog */}
      <Dialog open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
        <DialogContent className="rounded-xl border-2 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              API Key Generated
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Copy this key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {generatedKey && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Key className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{generatedKey.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {generatedKey.scopes.length} scope{generatedKey.scopes.length !== 1 ? 's' : ''} · {getExpiryBadge(generatedKey.expiresAt)}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Your API Key</p>
                  <code className="text-sm text-green-400 font-mono break-all leading-relaxed">
                    {generatedKey.fullKey}
                  </code>
                </div>

                <Button
                  onClick={() => handleCopyKey(generatedKey.fullKey || '')}
                  className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Store this key in a secure location. It cannot be retrieved after closing this dialog.</span>
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedKey(null)} className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white">
              I&apos;ve Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}