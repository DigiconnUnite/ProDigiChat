import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // User & Organization
  user: {
    id: string;
    name: string;
    email: string;
    organizationId: string;
    organizationName: string;
    role: string;
  } | null;
  
  // UI State
  sidebarOpen: boolean;
  activeTab: string;
  
  // Data State
  contacts: any[];
  campaigns: any[];
  messages: any[];
  
  // Loading States
  isLoading: boolean;
  isContactsLoading: boolean;
  isCampaignsLoading: boolean;
  
  // Actions
  setUser: (user: AppState['user']) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setContacts: (contacts: any[]) => void;
  setCampaigns: (campaigns: any[]) => void;
  setMessages: (messages: any[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsContactsLoading: (loading: boolean) => void;
  setIsCampaignsLoading: (loading: boolean) => void;
  
  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial State
      user: null,
      sidebarOpen: true,
      activeTab: 'dashboard',
      contacts: [],
      campaigns: [],
      messages: [],
      isLoading: false,
      isContactsLoading: false,
      isCampaignsLoading: false,
      
      // Actions
      setUser: (user) => set({ user }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setContacts: (contacts) => set({ contacts }),
      setCampaigns: (campaigns) => set({ campaigns }),
      setMessages: (messages) => set({ messages }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsContactsLoading: (loading) => set({ isContactsLoading: loading }),
      setIsCampaignsLoading: (loading) => set({ isCampaignsLoading: loading }),
      
      // Reset
      reset: () => set({
        user: null,
        sidebarOpen: true,
        activeTab: 'dashboard',
        contacts: [],
        campaigns: [],
        messages: [],
        isLoading: false,
        isContactsLoading: false,
        isCampaignsLoading: false,
      }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        user: state.user,
        sidebarOpen: state.sidebarOpen,
        activeTab: state.activeTab,
      }),
    }
  )
);
