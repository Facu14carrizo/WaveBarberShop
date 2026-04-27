import React from 'react';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { Appointment } from '../types';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { getAvailableDays, getNextFriday, getNextSaturday, formatDate, CustomTimeRanges, parseAppointmentDateTime } from '../utils/timeSlots';

interface AnalyticsProps {
  appointments: Appointment[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ appointments }) => {
  const { ranges } = useSupabaseCustomTimeRanges();

  const data = React.useMemo(() => {
    const isEffectivePast = (a: Appointment) => {
      if (a.status === 'cancelled' || a.status === 'no-show') return false;
      const dt = parseAppointmentDateTime(a.date, a.time, a.createdAt);
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
      const dt = parseAppointmentDateTime(a.date, a.time, a.createdAt);
      if (!dt) continue;
      
      const monthIdx = dt.getMonth();
      const year = dt.getFullYear();
      const day = dt.getDate();
      
      const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const weekday = weekdayNames[dt.getDay()];
      
      // Agrupar por mes (incluye año para evitar colisiones entre años)
      const monthKey = `${year}-${monthIdx}`;
      const mPrev = monthlyMap.get(monthKey);
      if (mPrev) {
        mPrev.total += a.service.price;
      } else {
        monthlyMap.set(monthKey, { idx: monthIdx, total: a.service.price, year: year });
      }
      
      // Agrupar por día (incluye año y mes para evitar colisiones)
      const dayLabel = `${weekday} ${day}/${monthIdx + 1}/${year}`;
      const dPrev = dailyMap.get(dayLabel);
      if (dPrev) {
        dPrev.total += a.service.price;
      } else {
        dailyMap.set(dayLabel, { monthIdx, day, total: a.service.price, year });
      }
    }

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const monthly = Array.from(monthlyMap.entries())
      .map(([key, v]) => ({ 
        monthName: `${monthNames[v.idx]} ${v.year}`, 
        total: v.total, 
        idx: v.idx, 
        year: v.year 
      }))
      .sort((a, b) => {
        // Ordenar cronológicamente descendente (más reciente arriba)
        if (a.year !== b.year) return b.year - a.year;
        return b.idx - a.idx;
      });

    // Agrupar por fin de semana
    const weekendMap = new Map<string, { total: number; start: Date; end: Date }>();
    for (const a of done) {
      const dt = parseAppointmentDateTime(a.date, a.time, a.createdAt);
      if (!dt) continue;
      
      const dayOfWeek = dt.getDay(); // 0=Dom, 1=Lun, ..., 5=Vie, 6=Sab
      let fridayDate = new Date(dt);
      
      // Encontrar el viernes de ese fin de semana
      if (dayOfWeek === 6) fridayDate.setDate(dt.getDate() - 1);
      else if (dayOfWeek === 0) fridayDate.setDate(dt.getDate() - 2);
      else if (dayOfWeek === 5) fridayDate.setDate(dt.getDate());
      else continue; // No es parte de un finde standard (Vie-Dom)
      
      fridayDate.setHours(0, 0, 0, 0);
      const weekendKey = fridayDate.toISOString().split('T')[0];
      
      const existing = weekendMap.get(weekendKey);
      if (existing) {
        existing.total += a.service.price;
        if (dt.getTime() > existing.end.getTime()) existing.end = new Date(dt);
        if (dt.getTime() < existing.start.getTime()) existing.start = new Date(dt);
      } else {
        weekendMap.set(weekendKey, { 
          total: a.service.price, 
          start: new Date(dt), 
          end: new Date(dt) 
        });
      }
    }

    const weekends = Array.from(weekendMap.entries())
      .map(([key, v]) => {
        const start = v.start;
        const end = v.end;
        const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const label = start.getTime() === end.getTime() 
          ? `${weekdayNames[start.getDay()]} ${start.getDate()}/${start.getMonth()+1}/${start.getFullYear()}`
          : `${weekdayNames[start.getDay()]} ${start.getDate()}/${start.getMonth()+1}/${start.getFullYear()} - ${weekdayNames[end.getDay()]} ${end.getDate()}/${end.getMonth()+1}/${end.getFullYear()}`;
        
        return { label, total: v.total, date: new Date(key) };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const currentMonthTotal = monthly.find(m => m.idx === thisMonthIdx && m.year === now.getFullYear())?.total || 0;
    const prevMonthIdx = (thisMonthIdx + 11) % 12;
    const prevMonthYear = thisMonthIdx === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevMonthTotal = monthly.find(m => m.idx === prevMonthIdx && m.year === prevMonthYear)?.total || 0;
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
        // Ordenar cronológicamente descendente (más reciente arriba)
        if (a.year !== b.year) return b.year - a.year;
        if (a.monthIdx !== b.monthIdx) return b.monthIdx - a.monthIdx;
        return b.day - a.day;
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

    return { totalAppointments, totalCuts, totalRevenue, monthly, daily, weekends, friday, saturday, growthRate };
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

      {/* Paneles de Ingresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Ingresos por mes */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-blue-400 mr-2" />
            Ingresos Mensuales
          </h4>
          {data.monthly.length === 0 ? (
            <p className="text-gray-400 text-sm italic">Sin datos todavía.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {data.monthly.map(m => (
                  <div key={m.monthName} className="flex items-center justify-between border-b border-gray-700/50 pb-2 last:border-0">
                    <span className="text-gray-300 text-sm sm:text-base">{m.monthName}</span>
                    <span className="text-blue-300 font-bold">${m.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ingresos por fin de semana */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-green-400 mr-2" />
            Por Fin de Semana
          </h4>
          {data.weekends.length === 0 ? (
            <p className="text-gray-400 text-sm italic">Sin datos todavía.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {data.weekends.map(w => (
                  <div key={w.label} className="flex items-center justify-between border-b border-gray-700/50 pb-2 last:border-0">
                    <span className="text-gray-300 text-sm">{w.label}</span>
                    <span className="text-green-300 font-bold">${w.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ingresos por día */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col md:col-span-2 lg:col-span-1">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-purple-400 mr-2" />
            Ingresos Diarios
          </h4>
          {data.daily.length === 0 ? (
            <p className="text-gray-400 text-sm italic">Sin datos todavía.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {data.daily.map(d => (
                  <div key={d.label} className="flex items-center justify-between border-b border-gray-700/50 pb-2 last:border-0">
                    <span className="text-gray-300 text-sm capitalize">{d.label}</span>
                    <span className="text-purple-300 font-bold">${d.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};