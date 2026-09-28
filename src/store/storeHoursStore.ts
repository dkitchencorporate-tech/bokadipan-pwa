import { create } from 'zustand';
import { api } from '../lib/apiClient';

export interface DayHours {
  open: string;
  close: string;
}

// Fallback: horario de dark-kitchen 100% delivery sembrado por defecto
// (13:00–23:30 todos los días) — se sustituye en cuanto responde /api/catalog.
export const DEFAULT_STORE_HOURS: Record<number, DayHours | null> = {
  0: { open: '13:00', close: '23:30' },
  1: { open: '13:00', close: '23:30' },
  2: { open: '13:00', close: '23:30' },
  3: { open: '13:00', close: '23:30' },
  4: { open: '13:00', close: '23:30' },
  5: { open: '13:00', close: '23:30' },
  6: { open: '13:00', close: '23:30' }
};

interface StoreHoursState {
  hours: Record<number, DayHours | null>;
  fetchHours: () => Promise<void>;
}

export const useStoreHoursStore = create<StoreHoursState>((set) => ({
  hours: DEFAULT_STORE_HOURS,

  fetchHours: async () => {
    try {
      const data = await api.get('/catalog');
      if (!data?.hours || data.hours.length === 0) return;
      const mapped: Record<number, DayHours | null> = {};
      data.hours.forEach((row: any) => {
        mapped[row.day_of_week] = row.is_open
          ? { open: String(row.open_time).slice(0, 5), close: String(row.close_time).slice(0, 5) }
          : null;
      });
      set({ hours: mapped });
    } catch {
      /* se queda con el fallback */
    }
  }
}));
