import { useStoreHoursStore } from '../store/storeHoursStore';
import { useSettingsStore } from '../store/settingsStore';

export interface DayHours {
  open: string;
  close: string;
}

export interface StoreStatusInfo {
  isOpen: boolean;
  statusType: 'open' | 'schedule_closed' | 'manual_closed';
  badgeText: string;
  detailText: string;
  nextOpeningText: string;
  todayHours: DayHours | null;
}

const DAYS_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Comprehensive check of store open/closed status combining database schedule & manual toggle
export const getStoreStatus = (): StoreStatusInfo => {
  const isFlagOpen = useSettingsStore.getState().isStoreOpenFlag;
  const now = new Date();
  const day = now.getDay();
  const storeHours = useStoreHoursStore.getState().hours;
  const todayHours = storeHours[day];

  // 1. Emergency manual closure takes top priority
  if (!isFlagOpen) {
    return {
      isOpen: false,
      statusType: 'manual_closed',
      badgeText: 'Cierre Manual',
      detailText: 'Servicio pausado temporalmente por administración',
      nextOpeningText: 'Pausado temporalmente',
      todayHours: todayHours || null
    };
  }

  // 2. Day off / not configured
  if (!todayHours) {
    let nextOpening = 'Próximo día laboral';
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = (day + offset) % 7;
      if (storeHours[nextDay]) {
        const dayLabel = offset === 1 ? 'mañana' : `el ${DAYS_NAMES[nextDay]}`;
        nextOpening = `Abre ${dayLabel} a las ${storeHours[nextDay]!.open}`;
        break;
      }
    }
    return {
      isOpen: false,
      statusType: 'schedule_closed',
      badgeText: 'Cerrado por Descanso',
      detailText: 'Hoy el local se encuentra cerrado',
      nextOpeningText: nextOpening,
      todayHours: null
    };
  }

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  // 3. Before opening hours today
  if (currentTime < openTime) {
    return {
      isOpen: false,
      statusType: 'schedule_closed',
      badgeText: 'Cerrado por Horario',
      detailText: `Abre hoy a las ${todayHours.open}`,
      nextOpeningText: `Abre hoy a las ${todayHours.open}`,
      todayHours
    };
  }

  // 4. After closing hours today
  if (currentTime > closeTime) {
    const tomorrowDay = (day + 1) % 7;
    const tomorrowHours = storeHours[tomorrowDay];
    const nextOpening = tomorrowHours 
      ? `Abre mañana a las ${tomorrowHours.open}`
      : 'Próxima apertura disponible mañana';

    return {
      isOpen: false,
      statusType: 'schedule_closed',
      badgeText: 'Cerrado por Horario',
      detailText: nextOpening,
      nextOpeningText: nextOpening,
      todayHours
    };
  }

  // 5. Open and ready for service
  return {
    isOpen: true,
    statusType: 'open',
    badgeText: 'Abierto al Público',
    detailText: `Servicio activo hasta las ${todayHours.close}`,
    nextOpeningText: `Abierto hoy hasta las ${todayHours.close}`,
    todayHours
  };
};

// Check if the store is currently open
export const isStoreOpen = (): boolean => {
  return getStoreStatus().isOpen;
};

// Generate available time slots for scheduling
// If open today: generates remaining slots for today (+30 min prep buffer)
// If closed before open today: generates slots for today starting from opening time
// If closed after hours: generates slots for tomorrow starting from tomorrow's opening time
export const generateAvailableTimeSlots = (intervalMinutes: number = 15): string[] => {
  const now = new Date();
  const day = now.getDay();
  const storeHours = useStoreHoursStore.getState().hours;
  const todayHours = storeHours[day];

  if (!todayHours) {
    // Look ahead to tomorrow
    const tomorrowDay = (day + 1) % 7;
    const tomorrowHours = storeHours[tomorrowDay];
    if (!tomorrowHours) return [];
    return generateSlotsForDay(tomorrowHours, intervalMinutes, 'Mañana');
  }

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  // Case A: Before opening today -> generate today's slots starting from opening time
  if (currentTime < openTime) {
    return generateSlotsRange(openTime, closeTime, intervalMinutes, 'Hoy');
  }

  // Case B: During operating hours -> generate from (now + 30 mins) until closing
  if (currentTime <= closeTime) {
    const preparationBuffer = 30;
    const startTime = Math.ceil((currentTime + preparationBuffer) / intervalMinutes) * intervalMinutes;
    if (startTime <= closeTime) {
      return generateSlotsRange(startTime, closeTime, intervalMinutes);
    }
  }

  // Case C: After closing today -> generate slots for tomorrow
  const tomorrowDay = (day + 1) % 7;
  const tomorrowHours = storeHours[tomorrowDay];
  if (tomorrowHours) {
    return generateSlotsForDay(tomorrowHours, intervalMinutes, 'Mañana');
  }

  return [];
};

function generateSlotsRange(startTime: number, closeTime: number, intervalMinutes: number, prefix?: string): string[] {
  const slots: string[] = [];
  for (let t = startTime; t <= closeTime; t += intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    if (h >= 24) continue;
    const formattedHour = h.toString().padStart(2, '0');
    const formattedMin = m.toString().padStart(2, '0');
    const timeStr = `${formattedHour}:${formattedMin}`;
    slots.push(prefix ? `${prefix} ${timeStr}` : timeStr);
  }
  return slots;
}

function generateSlotsForDay(hours: DayHours, intervalMinutes: number, prefix: string): string[] {
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  return generateSlotsRange(openTime, closeTime, intervalMinutes, prefix);
}
