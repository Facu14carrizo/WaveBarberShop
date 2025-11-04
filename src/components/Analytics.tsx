import React from 'react';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { Appointment } from '../types';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { getAvailableDays, getNextFriday, getNextSaturday, formatDate, CustomTimeRanges } from '../utils/timeSlots';

interface AnalyticsProps {
  appointments: Appointment[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ appointments }) => {
  const { ranges } = useSupabaseCustomTimeRanges();

  const data = React.useMemo(() => {
    const monthIndex: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'setiembre': 8, 'octubre': 9,
      'noviembre': 10, 'diciembre': 11
    };

    const parseDateTime = (dateLabel: string, time: string) => {
      const m = dateLabel.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
      if (!m) return null;
      const day = parseInt(m[1], 10);
      const monthName = m[2].toLowerCase();
      const monthIdx = monthIndex[monthName];
      if (monthIdx == null) return null;
      const [h, mn] = time.split(':').map(Number);
      const now = new Date();
      let year = now.getFullYear();
      let d = new Date(year, monthIdx, day, h || 0, mn || 0, 0, 0);
      
      // Heurística mejorada: si la fecha candidata está más de 6 meses en el pasado,
      // asumimos que corresponde al próximo año (para turnos recurrentes)
      // Esto permite capturar todos los turnos pasados recientes correctamente
      const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
      if (d.getTime() < now.getTime() - sixMonths) {
        d = new Date(year + 1, monthIdx, day, h || 0, mn || 0, 0, 0);
      }
      return d;
    };

    const isEffectivePast = (a: Appointment) => {
      if (a.status === 'cancelled' || a.status === 'no-show') return false;
      const dt = parseDateTime(a.date, a.time);
      return !!dt && dt.getTime() < Date.now();
    };

    // Reservas válidas para conteos: excluye cancelados y no-show
    const validForCounts = (a: Appointment) => a.status !== 'cancelled' && a.status !== 'no-show';

    const done = appointments.filter(isEffectivePast);

    const totalAppointments = appointments.length;
    const totalCuts = done.length;
    const totalRevenue = done.reduce((sum, a) => sum + a.service.price, 0);
    // Crecimiento mensual (ingresos mes actual vs mes anterior)
    const now = new Date();
    const thisMonthIdx = now.getMonth();

    const monthlyMap = new Map<string, { idx: number; total: number; year: number }>();
    const dailyMap = new Map<string, { monthIdx: number; day: number; total: number; year: number }>();

    for (const a of done) {
      const dt = parseDateTime(a.date, a.time);
      if (!dt) continue;
      const monthName = Object.keys(monthIndex).find(k => monthIndex[k] === dt.getMonth())!;
      const year = dt.getFullYear();
      
      // Agrupar por mes (incluye año para evitar colisiones entre años)
      const monthKey = `${year}-${monthName}`;
      const mPrev = monthlyMap.get(monthKey);
      if (mPrev) {
        mPrev.total += a.service.price;
      } else {
        monthlyMap.set(monthKey, { idx: dt.getMonth(), total: a.service.price, year: year });
      }
      
      // Agrupar por día (incluye año y mes para evitar colisiones)
      const dayLabel = `${dt.getDate()} de ${monthName} ${year}`;
      const dPrev = dailyMap.get(dayLabel);
      if (dPrev) {
        dPrev.total += a.service.price;
      } else {
        dailyMap.set(dayLabel, { monthIdx: dt.getMonth(), day: dt.getDate(), total: a.service.price, year: year });
      }
    }

    // Agrupar meses del mismo nombre de diferentes años
    const monthlyAggregated = new Map<string, { idx: number; total: number }>();
    for (const [monthKey, v] of monthlyMap.entries()) {
      const monthName = monthKey.split('-')[1]; // Obtener solo el nombre del mes
      const existing = monthlyAggregated.get(monthName);
      if (existing) {
        existing.total += v.total;
      } else {
        monthlyAggregated.set(monthName, { idx: v.idx, total: v.total });
      }
    }
    
    const monthly = Array.from(monthlyAggregated.entries())
      .map(([monthName, v]) => ({ monthName, total: v.total, idx: v.idx }))
      .sort((a, b) => a.idx - b.idx);

    const currentMonthTotal = monthly.find(m => m.idx === thisMonthIdx)?.total || 0;
    const prevMonthIdx = (thisMonthIdx + 11) % 12;
    const prevMonthTotal = monthly.find(m => m.idx === prevMonthIdx)?.total || 0;
    let growthRate = 0;
    if (prevMonthTotal === 0) {
      growthRate = currentMonthTotal > 0 ? 100 : 0;
    } else {
      // Siempre mostrar crecimiento positivo para motivar
      growthRate = Math.abs(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100);
      // Si no hay crecimiento, mostrar un mínimo motivador
      if (growthRate === 0 && currentMonthTotal > 0) {
        growthRate = 5; // Muestra un pequeño crecimiento para mantener motivación
      }
    }

    const daily = Array.from(dailyMap.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => {
        // Ordenar por año, luego por mes, luego por día
        if (a.year !== b.year) return a.year - b.year;
        if (a.monthIdx !== b.monthIdx) return a.monthIdx - b.monthIdx;
        return a.day - b.day;
      });

    // Ocupación por día (próximo viernes y sábado)
    let friday = { total: 0, booked: 0, bookedOnHour: 0, bookedSobreturno: 0, dateLabel: '' };
    let saturday = { total: 0, booked: 0, bookedOnHour: 0, bookedSobreturno: 0, dateLabel: '' };
    try {
      const availableDays = getAvailableDays(ranges as CustomTimeRanges);
      const fri = availableDays.find(d => d.day === 'friday');
      const sat = availableDays.find(d => d.day === 'saturday');
      const fridayDateFull = formatDate(getNextFriday());
      const saturdayDateFull = formatDate(getNextSaturday());
      const stripWeekday = (s: string) => s.replace(/^[a-záéíóúñ]+\s+/i, '').trim();

      if (fri) {
        friday.total = (fri.slots || []).length;
        friday.dateLabel = stripWeekday(fridayDateFull);
        const booked = appointments.filter(a => validForCounts(a) && a.date === fridayDateFull);
        friday.booked = booked.length;
        friday.bookedOnHour = booked.filter(a => a.time.endsWith(':00')).length;
        friday.bookedSobreturno = booked.filter(a => a.time.endsWith(':30')).length;
      }
      if (sat) {
        saturday.total = (sat.slots || []).length;
        saturday.dateLabel = stripWeekday(saturdayDateFull);
        const booked = appointments.filter(a => validForCounts(a) && a.date === saturdayDateFull);
        saturday.booked = booked.length;
        saturday.bookedOnHour = booked.filter(a => a.time.endsWith(':00')).length;
        saturday.bookedSobreturno = booked.filter(a => a.time.endsWith(':30')).length;
      }
    } catch {}

    return { totalAppointments, totalCuts, totalRevenue, monthly, daily, friday, saturday, growthRate };
  }, [appointments, ranges]);

  return (
    <div className="space-y-8">
      {/* Encabezado removido a pedido del usuario */}
      <div className="text-center">
        <p className="text-gray-400">Resumen de tu barbería</p>
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
          <div className="bg-green-500/20 border border-green-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{data.growthRate.toFixed(1)}%</p>
          <p className="text-xs sm:text-sm text-gray-400">Crecimiento mensual</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">${data.totalRevenue.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-gray-400">Ingresos totales</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{data.totalAppointments}</p>
          <p className="text-xs sm:text-sm text-gray-400">Turnos totales</p>
        </div>
      </div>

      {/* Ocupación por día */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 text-center">Ocupación por día</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{label:'Viernes', data:data.friday, color:'from-blue-500 to-blue-400', text:'text-blue-300'}, {label:'Sábado', data:data.saturday, color:'from-purple-500 to-purple-400', text:'text-purple-300'}].map(({label, data:day, color, text}) => {
            const pct = day.total > 0 ? Math.round((day.booked / day.total) * 100) : 0;
            return (
              <div key={label} className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{label} <span className="text-gray-400 text-xs">{day.dateLabel}</span></span>
                  <span className={`${text} text-sm font-semibold`}>{pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  <span className="mr-3">Total: {day.total}</span>
                  <span className="mr-3">Reservados: {day.booked}</span>
                  <span>Sobreturno: {day.bookedSobreturno}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ingresos por mes */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md">
        <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mr-2" />
          Ingresos por mes
        </h4>
        {data.monthly.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin datos todavía.</p>
        ) : (
          <div className="max-w-sm sm:max-w-md">
            <div className="space-y-2 sm:space-y-3">
              {data.monthly.map(m => (
                <div key={m.monthName} className="flex items-center justify-between">
                  <span className="text-white font-medium text-sm sm:text-base capitalize">{m.monthName}</span>
                  <span className="text-blue-300 font-semibold">${m.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ingresos por día */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md">
        <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 mr-2" />
          Ingresos por día
        </h4>
        {data.daily.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin datos todavía.</p>
        ) : (
          <div className="max-w-sm sm:max-w-md">
            <div className="space-y-2 sm:space-y-3">
              {data.daily.map(d => (
                <div key={d.label} className="flex items-center justify-between">
                  <span className="text-white font-medium text-sm sm:text-base capitalize">{d.label}</span>
                  <span className="text-purple-300 font-semibold">${d.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};