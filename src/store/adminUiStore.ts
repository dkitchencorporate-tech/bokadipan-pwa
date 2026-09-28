import { create } from 'zustand';

export type AdminTab = 'orders' | 'history' | 'kiosk' | 'catalog' | 'analytics' | 'printers' | 'schedule' | 'clients' | 'business';

interface AdminUiState {
  activeTab: AdminTab;
  editingOrder: any | null; // El pedido que se está editando
  isAudioArmed: boolean;
  isAlarmRinging: boolean;
  silencedOrderIds: Set<string>;
  
  setActiveTab: (tab: AdminTab) => void;
  setEditingOrder: (order: any | null) => void;
  startEditingOrder: (order: any) => void;
  finishEditingOrder: () => void;
  setIsAudioArmed: (armed: boolean) => void;
  setIsAlarmRinging: (ringing: boolean) => void;
  addSilencedOrderIds: (ids: string[]) => void;
}

const getInitialSilencedOrderIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('brand_silenced_order_ids') || localStorage.getItem('sff_silenced_order_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const useAdminUiStore = create<AdminUiState>((set) => ({
  activeTab: 'orders',
  editingOrder: null,
  isAudioArmed: false,
  isAlarmRinging: false,
  silencedOrderIds: getInitialSilencedOrderIds(),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setEditingOrder: (order) => set({ editingOrder: order }),
  
  startEditingOrder: (order) => {
    set({ editingOrder: order, activeTab: 'kiosk' });
  },
  
  finishEditingOrder: () => {
    set({ editingOrder: null, activeTab: 'orders' });
  },

  setIsAudioArmed: (armed: boolean) => set({ isAudioArmed: armed }),

  setIsAlarmRinging: (ringing: boolean) => set({ isAlarmRinging: ringing }),

  addSilencedOrderIds: (ids: string[]) => {
    set((state) => {
      const next = new Set(state.silencedOrderIds);
      ids.forEach((id) => next.add(id));
      try {
        localStorage.setItem('brand_silenced_order_ids', JSON.stringify([...next]));
      } catch {}
      return { silencedOrderIds: next };
    });
  }
}));
