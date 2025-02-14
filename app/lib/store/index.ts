import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  jurisdiction: "federal" | "state" | "all" | null;
  state: string | null;
  status: string | null;
  searchQuery: string;
  page: number;
  limit: number;
}

interface SyncState {
  isSyncing: boolean;
  isSyncingFederal: boolean;
  lastSyncTime: string | null;
  lastFederalSyncTime: string | null;
  totalBillsSynced: number;
  totalFederalBillsSynced: number;
}

interface ChatState {
  isOpen: boolean;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  attachments: Array<{
    name: string;
    url: string;
  }>;
}

interface UIState {
  sidebarOpen: boolean;
  selectedBillId: string | null;
  filters: FilterState;
  darkMode: boolean;
  sync: SyncState;
  chat: ChatState;
}

interface UIActions {
  setSyncing: (isSyncing: boolean) => void;
  setSyncingFederal: (isSyncing: boolean) => void;
  updateSyncStats: (totalBills: number) => void;
  updateFederalSyncStats: (totalBills: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedBill: (billId: string | null) => void;
  setFilter: (key: keyof FilterState, value: string | number | null) => void;
  resetFilters: () => void;
  toggleDarkMode: () => void;
  // Chat actions
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  addMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
  addAttachment: (attachment: { name: string; url: string }) => void;
  clearChat: () => void;
}

const initialFilters: FilterState = {
  jurisdiction: "all",
  state: null,
  status: null,
  searchQuery: '',
  page: 1,
  limit: 10,
};

export const useStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      selectedBillId: null,
      filters: initialFilters,
      darkMode: false,
      sync: {
        isSyncing: false,
        isSyncingFederal: false,
        lastSyncTime: null,
        lastFederalSyncTime: null,
        totalBillsSynced: 0,
        totalFederalBillsSynced: 0,
      },
      chat: {
        isOpen: false,
        messages: [],
        attachments: [],
      },

      // Actions
      setSyncing: (isSyncing: boolean) =>
        set((state) => ({
          sync: {
            ...state.sync,
            isSyncing,
            ...(isSyncing ? {} : { lastSyncTime: new Date().toISOString() }),
          },
        })),

      setSyncingFederal: (isSyncing: boolean) =>
        set((state) => ({
          sync: {
            ...state.sync,
            isSyncingFederal: isSyncing,
            ...(isSyncing ? {} : { lastFederalSyncTime: new Date().toISOString() }),
          },
        })),

      updateSyncStats: (totalBills: number) =>
        set((state) => ({
          sync: {
            ...state.sync,
            totalBillsSynced: totalBills,
          },
        })),

      updateFederalSyncStats: (totalBills: number) =>
        set((state) => ({
          sync: {
            ...state.sync,
            totalFederalBillsSynced: totalBills,
          },
        })),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSidebarOpen: (open: boolean) =>
        set({ sidebarOpen: open }),
      
      setSelectedBill: (billId: string | null) =>
        set({ selectedBillId: billId }),
      
      setFilter: (key: keyof FilterState, value: string | number | null) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
            // Reset page when changing filters
            ...(key !== 'page' && { page: 1 }),
          },
        })),
      
      resetFilters: () =>
        set({ filters: initialFilters }),

      toggleDarkMode: () =>
        set((state) => ({ darkMode: !state.darkMode })),

      // Chat actions
      toggleChat: () =>
        set((state) => ({
          chat: { ...state.chat, isOpen: !state.chat.isOpen }
        })),

      setChatOpen: (open: boolean) =>
        set((state) => ({
          chat: { ...state.chat, isOpen: open }
        })),

      addMessage: (message) =>
        set((state) => ({
          chat: {
            ...state.chat,
            messages: [...state.chat.messages, message]
          }
        })),

      addAttachment: (attachment) =>
        set((state) => ({
          chat: {
            ...state.chat,
            attachments: [...state.chat.attachments, attachment]
          }
        })),

      clearChat: () =>
        set((state) => ({
          chat: {
            ...state.chat,
            messages: [],
            attachments: []
          }
        })),
    }),
    {
      name: 'firetrack-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
        filters: state.filters,
      }),
    }
  )
);

// Selector hooks for specific state slices
export const useFilters = () => useStore((state) => state.filters);
export const useSidebar = () => useStore((state) => ({
  open: state.sidebarOpen,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen,
}));
export const useSelectedBill = () => useStore((state) => ({
  selectedBillId: state.selectedBillId,
  setSelectedBill: state.setSelectedBill,
}));
export const useDarkMode = () => useStore((state) => ({
  darkMode: state.darkMode,
  toggle: state.toggleDarkMode,
}));

export const useSync = () => useStore((state) => ({
  ...state.sync,
  setSyncing: state.setSyncing,
  setSyncingFederal: state.setSyncingFederal,
  updateSyncStats: state.updateSyncStats,
  updateFederalSyncStats: state.updateFederalSyncStats,
}));

export const useChat = () => useStore((state) => ({
  ...state.chat,
  toggle: state.toggleChat,
  setOpen: state.setChatOpen,
  addMessage: state.addMessage,
  addAttachment: state.addAttachment,
  clear: state.clearChat,
}));
