import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  // Types
  GeneralSettings,
  WhatsAppSettings,
  TeamSettings,
  TeamMember,
  ApiKey,
  NotificationSettings,
  BillingSettings,
  Webhook,
  PrivacySettings,
  // API Functions
  getGeneralSettings,
  updateGeneralSettings,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  disconnectWhatsApp,
  reconnectWhatsApp,
  getTeamSettings,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  regenerateApiKey,
  getNotificationSettings,
  updateNotificationSettings,
  getBillingSettings,
  updateBillingSettings,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getPrivacySettings,
  updatePrivacySettings,
  exportUserData,
  deleteUserData,
  resetAllSettings,
  importSettings,
  exportSettings,
  handleApiError,
} from '@/lib/settings-api';

// ==================== Query Keys ====================

export const queryKeys = {
  general: ['settings', 'general'] as const,
  whatsapp: ['settings', 'whatsapp'] as const,
  team: ['settings', 'team'] as const,
  apiKeys: ['settings', 'apiKeys'] as const,
  notifications: ['settings', 'notifications'] as const,
  billing: ['settings', 'billing'] as const,
  webhooks: ['settings', 'webhooks'] as const,
  privacy: ['settings', 'privacy'] as const,
  allSettings: ['settings'] as const,
};

// ==================== General Settings Hook ====================

export function useGeneralSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.general,
    queryFn: getGeneralSettings,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: updateGeneralSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.general });
      const previousSettings = queryClient.getQueryData(queryKeys.general);
      queryClient.setQueryData(queryKeys.general, (old) => {
        if (!old) return old;
        return { ...old, ...newSettings };
      });
      return { previousSettings };
    },
    onError: (err, _newSettings, context) => {
      queryClient.setQueryData(queryKeys.general, context?.previousSettings);
      toast.error(handleApiError(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.general });
    },
  });

  return useMemo(
    () => ({
      settings: data || null,
      isLoading,
      error: error as Error | null,
      refetch,
      update: updateMutation.mutateAsync,
      isUpdating: updateMutation.isPending,
    }),
    [data, isLoading, error, refetch, updateMutation]
  );
}

// ==================== WhatsApp Settings Hook ====================

export function useWhatsAppSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.whatsapp,
    queryFn: getWhatsAppSettings,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: updateWhatsAppSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.whatsapp });
      const previousSettings = queryClient.getQueryData(queryKeys.whatsapp);
      queryClient.setQueryData(queryKeys.whatsapp, (old) => {
        if (!old) return old;
        return { ...old, ...newSettings };
      });
      return { previousSettings };
    },
    onError: (err, _newSettings, context) => {
      queryClient.setQueryData(queryKeys.whatsapp, context?.previousSettings);
      toast.error(handleApiError(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectWhatsApp,
    onSuccess: () => {
      toast.success('WhatsApp disconnected successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: reconnectWhatsApp,
    onSuccess: () => {
      toast.success('Reconnection initiated');
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  return useMemo(
    () => ({
      settings: data || null,
      isLoading,
      error: error as Error | null,
      refetch,
      update: updateMutation.mutateAsync,
      isUpdating: updateMutation.isPending,
      disconnect: disconnectMutation.mutateAsync,
      isDisconnecting: disconnectMutation.isPending,
      reconnect: reconnectMutation.mutateAsync,
      isReconnecting: reconnectMutation.isPending,
    }),
    [data, isLoading, error, refetch, updateMutation, disconnectMutation, reconnectMutation]
  );
}

// ==================== Team Settings Hook ====================

export function useTeamSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.team,
    queryFn: getTeamSettings,
    staleTime: 5 * 60 * 1000,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: TeamMember['role'] }) =>
      inviteTeamMember(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Partial<TeamMember> }) =>
      updateTeamMember(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  return useMemo(
    () => ({
      settings: data || null,
      isLoading,
      error: error as Error | null,
      refetch,
      invite: inviteMutation.mutateAsync,
      isInviting: inviteMutation.isPending,
      updateMember: updateMemberMutation.mutateAsync,
      isUpdating: updateMemberMutation.isPending,
      removeMember: removeMemberMutation.mutateAsync,
      isRemoving: removeMemberMutation.isPending,
    }),
    [data, isLoading, error, refetch, inviteMutation, updateMemberMutation, removeMemberMutation]
  );
}

// ==================== API Keys Hook ====================

export function useApiKeys() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: getApiKeys,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, permissions }: { name: string; permissions: string[] }) =>
      createApiKey(name, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  return useMemo(
    () => ({
      apiKeys: data || [],
      isLoading,
      error: error as Error | null,
      refetch,
      create: createMutation.mutateAsync,
      isCreating: createMutation.isPending,
      delete: deleteMutation.mutateAsync,
      isDeleting: deleteMutation.isPending,
      regenerate: regenerateMutation.mutateAsync,
      isRegenerating: regenerateMutation.isPending,
    }),
    [data, isLoading, error, refetch, createMutation, deleteMutation, regenerateMutation]
  );
}

// ==================== Notification Settings Hook ====================

export function useNotificationSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotificationSettings,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previousSettings = queryClient.getQueryData(queryKeys.notifications);
      queryClient.setQueryData(queryKeys.notifications, (old) => {
        if (!old) return old;
        return { ...old, ...newSettings };
      });
      return { previousSettings };
    },
    onError: (err, _newSettings, context) => {
      queryClient.setQueryData(queryKeys.notifications, context?.previousSettings);
      toast.error(handleApiError(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  return useMemo(
    () => ({
      settings: data || null,
      isLoading,
      error: error as Error | null,
      refetch,
      update: updateMutation.mutateAsync,
      isUpdating: updateMutation.isPending,
    }),
    [data, isLoading, error, refetch, updateMutation]
  );
}

// ==================== Billing Settings Hook ====================

export function useBillingSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.billing,
    queryFn: getBillingSettings,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: updateBillingSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.billing });
      const previousSettings = queryClient.getQueryData(queryKeys.billing);
      queryClient.setQueryData(queryKeys.billing, (old) => {
        if (!old) return old;
        return { ...old, ...newSettings };
      });
      return { previousSettings };
    },
    onError: (err, _newSettings, context) => {
      queryClient.setQueryData(queryKeys.billing, context?.previousSettings);
      toast.error(handleApiError(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast.success('Subscription cancelled');
      queryClient.invalidateQueries({ queryKey: queryKeys.billing });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: reactivateSubscription,
    onSuccess: () => {
      toast.success('Subscription reactivated');
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  return useMemo(
    () => ({
      settings: data || null,
      isLoading,
      error: error as Error | null,
      refetch,
      update: updateMutation.mutateAsync,
      isUpdating: updateMutation.isPending,
      cancelSubscription: cancelSubscriptionMutation.mutateAsync,
      isCancelling: cancelSubscriptionMutation.isPending,
      reactivateSubscription: reactivateSubscriptionMutation.mutateAsync,
      isReactivating: reactivateSubscriptionMutation.isPending,
    }),
    [data, isLoading, error, refetch, updateMutation, cancelSubscriptionMutation, reactivateSubscriptionMutation]
  );
}

// ==================== Webhooks Hook ====================

export function useWebhooks() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.webhooks,
    queryFn: getWebhooks,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, webhook }: { id: string; webhook: Partial<Webhook> }) =>
      updateWebhook(id, webhook),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Webhook test successful');
      } else {
        toast.error('Webhook test failed');
      }
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  return useMemo(
    () => ({
      webhooks: data || [],
      isLoading,
      error: error as Error | null,
      refetch,
      create: createMutation.mutateAsync,
      isCreating: createMutation.isPending,
      update: updateMutation.mutateAsync,
      isUpdating: updateMutation.isPending,
      delete: deleteMutation.mutateAsync,
      isDeleting: deleteMutation.isPending,
      test: testMutation.mutateAsync,
      isTesting: testMutation.isPending,
    }),
    [data, isLoading, error, refetch, createMutation, updateMutation, deleteMutation, testMutation]
  );
}

// ==================== Privacy Settings Hook ====================

export function usePrivacySettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.privacy,
    queryFn: getPrivacySettings,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: updatePrivacySettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.privacy });
      const previousSettings = queryClient.getQueryData(queryKeys.privacy);
      queryClient.setQueryData(queryKeys.privacy, (old) => {
        if (!old) return old;
        return { ...old, ...newSettings };
      });
      return { previousSettings };
    },
    onError: (err, _newSettings, context) => {
      queryClient.setQueryData(queryKeys.privacy, context?.previousSettings);
      toast.error(handleApiError(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacy });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: exportUserData,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data-export.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Data export downloaded');
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const deleteDataMutation = useMutation({
    mutationFn: deleteUserData,
    onSuccess: () => {
      toast.success('Data deletion request submitted');
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  return useMemo(
    () => ({
      settings: data || null,
      isLoading,
      error: error as Error | null,
      refetch,
      update: updateMutation.mutateAsync,
      isUpdating: updateMutation.isPending,
      exportData: exportDataMutation.mutateAsync,
      isExporting: exportDataMutation.isPending,
      deleteData: deleteDataMutation.mutateAsync,
      isDeleting: deleteDataMutation.isPending,
    }),
    [data, isLoading, error, refetch, updateMutation, exportDataMutation, deleteDataMutation]
  );
}

// ==================== Settings Utility Hooks ====================

export function useResetAllSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetAllSettings,
    onSuccess: () => {
      toast.success('All settings reset to defaults');
      queryClient.invalidateQueries({ queryKey: queryKeys.allSettings });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });
}

export function useImportSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importSettings,
    onSuccess: () => {
      toast.success('Settings imported successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.allSettings });
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });
}

export function useExportSettings() {
  return useMutation({
    mutationFn: exportSettings,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'settings-export.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Settings exported');
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });
}

// ==================== Prefetch Settings ====================

export function usePrefetchSettings() {
  const queryClient = useQueryClient();

  const prefetchGeneral = useCallback(
    () => queryClient.prefetchQuery({ queryKey: queryKeys.general, queryFn: getGeneralSettings }),
    [queryClient]
  );

  const prefetchWhatsApp = useCallback(
    () => queryClient.prefetchQuery({ queryKey: queryKeys.whatsapp, queryFn: getWhatsAppSettings }),
    [queryClient]
  );

  const prefetchTeam = useCallback(
    () => queryClient.prefetchQuery({ queryKey: queryKeys.team, queryFn: getTeamSettings }),
    [queryClient]
  );

  const prefetchApiKeys = useCallback(
    () => queryClient.prefetchQuery({ queryKey: queryKeys.apiKeys, queryFn: getApiKeys }),
    [queryClient]
  );

  const prefetchNotifications = useCallback(
    () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.notifications,
        queryFn: getNotificationSettings,
      }),
    [queryClient]
  );

  const prefetchBilling = useCallback(
    () => queryClient.prefetchQuery({ queryKey: queryKeys.billing, queryFn: getBillingSettings }),
    [queryClient]
  );

  const prefetchWebhooks = useCallback(
    () => queryClient.prefetchQuery({ queryKey: queryKeys.webhooks, queryFn: getWebhooks }),
    [queryClient]
  );

  const prefetchPrivacy = useCallback(
    () => queryClient.prefetchQuery({ queryKey: queryKeys.privacy, queryFn: getPrivacySettings }),
    [queryClient]
  );

  const prefetchAllSettings = useCallback(async () => {
    await Promise.all([
      prefetchGeneral(),
      prefetchWhatsApp(),
      prefetchTeam(),
      prefetchApiKeys(),
      prefetchNotifications(),
      prefetchBilling(),
      prefetchWebhooks(),
      prefetchPrivacy(),
    ]);
  }, [
    prefetchGeneral,
    prefetchWhatsApp,
    prefetchTeam,
    prefetchApiKeys,
    prefetchNotifications,
    prefetchBilling,
    prefetchWebhooks,
    prefetchPrivacy,
  ]);

  return {
    prefetchGeneral,
    prefetchWhatsApp,
    prefetchTeam,
    prefetchApiKeys,
    prefetchNotifications,
    prefetchBilling,
    prefetchWebhooks,
    prefetchPrivacy,
    prefetchAllSettings,
  };
}
