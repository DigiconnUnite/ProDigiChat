'use client';

import { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Loader2,
  ExternalLink,
  FileText,
  Eye,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface Template {
  id: string;
  name: string;
  category: string;
  status: 'approved' | 'pending' | 'rejected';
  language?: string;
  updatedAt?: string;
}

export interface TemplateSyncStatusProps {
  templates: Template[];
  lastSynced?: string;
  onSync?: () => void;
  onUseTemplate?: (template: Template) => void;
  onViewTemplate?: (template: Template) => void;
  onEditTemplate?: (template: Template) => void;
  isSyncing?: boolean;
  className?: string;
}

export function TemplateSyncStatus({
  templates,
  lastSynced,
  onSync,
  onUseTemplate,
  onViewTemplate,
  onEditTemplate,
  isSyncing,
  className
}: TemplateSyncStatusProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  const approvedTemplates = templates.filter(t => t.status === 'approved');
  const pendingTemplates = templates.filter(t => t.status === 'pending');
  const rejectedTemplates = templates.filter(t => t.status === 'rejected');

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': 
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case 'pending': 
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
      case 'rejected': 
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default: 
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const TemplateItem = ({ template }: { template: Template }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-green-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded flex items-center justify-center",
          template.status === 'approved' && "bg-green-100",
          template.status === 'pending' && "bg-yellow-100",
          template.status === 'rejected' && "bg-red-100"
        )}>
          <FileText className={cn(
            "w-4 h-4",
            template.status === 'approved' && "text-green-600",
            template.status === 'pending' && "text-yellow-600",
            template.status === 'rejected' && "text-red-600"
          )} />
        </div>
        <div>
          <p className="font-medium text-sm">{template.name}</p>
          <p className="text-xs text-gray-500">
            {template.category} {template.language && `• ${template.language}`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {getStatusBadge(template.status)}
        
        <div className="flex items-center gap-1">
          {onUseTemplate && template.status === 'approved' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUseTemplate(template)}
            >
              Use
            </Button>
          )}
          {onViewTemplate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewTemplate(template)}
            >
              <Eye className="w-3 h-3" />
            </Button>
          )}
          {onEditTemplate && template.status === 'rejected' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditTemplate(template)}
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Template Sync Status
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Last synced: {formatDate(lastSynced)}
            </span>
            {onSync && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Sync Now
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-700">{approvedTemplates.length}</p>
            <p className="text-xs text-green-600">Approved</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-700">{pendingTemplates.length}</p>
            <p className="text-xs text-yellow-600">Pending</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-700">{rejectedTemplates.length}</p>
            <p className="text-xs text-red-600">Rejected</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              Approved ({approvedTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">
              Pending ({pendingTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">
              Rejected ({rejectedTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-2">
            {templates.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No templates found</p>
            ) : (
              templates.map(template => (
                <TemplateItem key={template.id} template={template} />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4 space-y-2">
            {approvedTemplates.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No approved templates</p>
            ) : (
              approvedTemplates.map(template => (
                <TemplateItem key={template.id} template={template} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4 space-y-2">
            {pendingTemplates.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending templates</p>
            ) : (
              pendingTemplates.map(template => (
                <TemplateItem key={template.id} template={template} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4 space-y-2">
            {rejectedTemplates.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No rejected templates</p>
            ) : (
              rejectedTemplates.map(template => (
                <TemplateItem key={template.id} template={template} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default TemplateSyncStatus;
