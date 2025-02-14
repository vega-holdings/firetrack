import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  state: string | null;
  status: string | null;
  searchQuery: string;
  page: number;
  limit: number;
}

interface UIState {
  sidebarOpen: boolean;
  selectedBillId: string | null;
  filters: FilterState;
  darkMode: boolean;
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedBill: (billId: string | null) => void;
  setFilter: (key: keyof FilterState, value: string | number | null) => void;
  resetFilters: () => void;
  toggleDarkMode: () => void;
}

const initialFilters: FilterState = {
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

      // Actions
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
