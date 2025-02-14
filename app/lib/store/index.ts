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
  lastSyncTime: string | null;
  totalBillsSynced: number;
}

interface UIState {
  sidebarOpen: boolean;
  selectedBillId: string | null;
  filters: FilterState;
  darkMode: boolean;
  sync: SyncState;
}

interface UIActions {
  setSyncing: (isSyncing: boolean) => void;
  updateSyncStats: (totalBills: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedBill: (billId: string | null) => void;
  setFilter: (key: keyof FilterState, value: string | number | null) => void;
  resetFilters: () => void;
  toggleDarkMode: () => void;
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
        lastSyncTime: null,
        totalBillsSynced: 0,
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

      updateSyncStats: (totalBills: number) =>
        set((state) => ({
          sync: {
            ...state.sync,
            totalBillsSynced: totalBills,
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
  updateSyncStats: state.updateSyncStats,
}));
