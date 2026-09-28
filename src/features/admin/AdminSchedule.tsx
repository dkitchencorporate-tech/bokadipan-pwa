import { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';

interface DayRow {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lunes..Domingo
const DAY_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
};

export default function AdminSchedule() {
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [savedDay, setSavedDay] = useState<number | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { hours } = await api.get('/admin/settings');
      if (hours && hours.length > 0) {
        setRows(hours as DayRow[]);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const updateLocal = (day: number, patch: Partial<DayRow>) => {
    setRows(prev => prev.map(r => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  const saveDay = async (day: number) => {
    const row = rows.find(r => r.day_of_week === day);
    if (!row) return;
    setSavingDay(day);
    try {
      await api.put('/admin/settings', {
        hours: [{
          day_of_week: day,
          is_open: row.is_open,
          open_time: row.is_open ? row.open_time : null,
          close_time: row.is_open ? row.close_time : null
        }]
      });
      setSavingDay(null);
      setSavedDay(day);
      setTimeout(() => setSavedDay(null), 1600);
    } catch (e: any) {
      setSavingDay(null);
      alert('No se pudo guardar el horario de este día: ' + (e?.message || 'error desconocido'));
    }
  };

  const todayDow = new Date().getDay();
  const todayRow = rows.find(r => r.day_of_week === todayDow);

  return (
    <div className="p-4 sm:p-8 pb-24 sm:pb-8 max-w-3xl mx-auto font-sans text-zinc-900">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display font-black text-xl sm:text-2xl text-zinc-900 uppercase tracking-wide">Horarios de Servicio</h2>
          <p className="text-zinc-500 text-xs">Configuración semanal de apertura y cierre para pedidos en vivo.</p>
        </div>
      </div>

      {loadError && (
        <div className="my-5 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs leading-relaxed">
          No se pudo sincronizar la tabla de horarios (<code>store_hours</code>).
        </div>
      )}

      {todayRow && (
        <div className="my-5 bg-white border border-amber-300 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">Estado Hoy ({DAY_LABELS[todayDow]})</span>
            <p className="text-zinc-900 font-display font-black text-base mt-0.5">
              {todayRow.is_open
                ? `Abierto de ${todayRow.open_time?.slice(0, 5)} a ${todayRow.close_time?.slice(0, 5)}`
                : 'Cerrado por descanso'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${todayRow.is_open ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-100 text-zinc-500'}`}>
            {todayRow.is_open ? 'En Servicio' : 'Cerrado'}
          </span>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400 text-xs py-8 text-center font-medium">Cargando horarios...</p>
      ) : (
        <div className="space-y-2.5">
          {DAY_ORDER.map(day => {
            const row = rows.find(r => r.day_of_week === day);
            if (!row) return null;
            return (
              <div
                key={day}
                className="bg-white border border-zinc-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-xs"
              >
                <div className="flex items-center justify-between sm:w-36 shrink-0">
                  <span className="font-bold text-zinc-900 text-sm">{DAY_LABELS[day]}</span>
                  <button
                    onClick={() => updateLocal(day, { is_open: !row.is_open })}
                    className={`ml-3 relative w-11 h-6 rounded-full transition-colors ${row.is_open ? 'bg-amber-500' : 'bg-zinc-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${row.is_open ? 'translate-x-5' : ''}`}
                    ></span>
                  </button>
                </div>

                {row.is_open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={row.open_time?.slice(0, 5) || ''}
                      onChange={(e) => updateLocal(day, { open_time: e.target.value })}
                      className="bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-900 text-xs font-bold focus:border-amber-500 outline-none"
                    />
                    <span className="text-zinc-400 text-xs">a</span>
                    <input
                      type="time"
                      value={row.close_time?.slice(0, 5) || ''}
                      onChange={(e) => updateLocal(day, { close_time: e.target.value })}
                      className="bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-900 text-xs font-bold focus:border-amber-500 outline-none"
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-zinc-400 text-xs italic">Cerrado todo el día</span>
                )}

                <button
                  onClick={() => saveDay(day)}
                  disabled={savingDay === day}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-all shrink-0 shadow-xs"
                >
                  {savingDay === day ? 'Guardando...' : savedDay === day ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
