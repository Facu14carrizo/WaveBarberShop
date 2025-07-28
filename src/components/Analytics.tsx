import React from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Clock, Star } from 'lucide-react';
import { Analytics as AnalyticsType, Appointment } from '../types';

interface AnalyticsProps {
  appointments: Appointment[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ appointments }) => {
  const analytics: AnalyticsType = React.useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const noShow = appointments.filter(a => a.status === 'no-show').length;
    
    const revenue = appointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a.service.price, 0);

    const serviceCount = appointments.reduce((acc, a) => {
      acc[a.service.name] = (acc[a.service.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularServices = Object.entries(serviceCount)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const hourCount = appointments.reduce((acc, a) => {
      const hour = a.time.split(':')[0] + ':00';
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const busyHours = Object.entries(hourCount)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAppointments: total,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      noShowAppointments: noShow,
      revenue,
      popularServices,
      busyHours
    };
  }, [appointments]);

  const completionRate = analytics.totalAppointments > 0 
    ? (analytics.completedAppointments / analytics.totalAppointments * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          Analytics Dashboard
        </h3>
        <p className="text-gray-400">Insights de tu barbería</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{analytics.totalAppointments}</p>
          <p className="text-xs sm:text-sm text-gray-400">Total Turnos</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
          <div className="bg-green-500/20 border border-green-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{completionRate}%</p>
          <p className="text-xs sm:text-sm text-gray-400">Completados</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">${analytics.revenue.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-gray-400">Ingresos</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
          <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{analytics.completedAppointments}</p>
          <p className="text-xs sm:text-sm text-gray-400">Clientes</p>
        </div>
      </div>

      {/* Popular Services */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mr-2" />
          Servicios Populares
        </h4>
        <div className="space-y-2 sm:space-y-3">
          {analytics.popularServices.map((service, index) => (
            <div key={service.service} className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-gray-500/20 text-gray-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {index + 1}
                </div>
                <span className="text-white font-medium text-sm sm:text-base">{service.service}</span>
              </div>
              <span className="text-gray-400 text-sm">{service.count} turnos</span>
            </div>
          ))}
        </div>
      </div>

      {/* Busy Hours */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mr-2" />
          Horarios Más Solicitados
        </h4>
        <div className="space-y-2 sm:space-y-3">
          {analytics.busyHours.map((hour) => (
            <div key={hour.hour} className="flex items-center justify-between">
              <span className="text-white font-medium text-sm sm:text-base">{hour.hour}</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 sm:w-24 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${(hour.count / Math.max(...analytics.busyHours.map(h => h.count))) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 text-xs sm:text-sm w-6 sm:w-8">{hour.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};