import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CustomerView } from './components/CustomerView';
import { OwnerDashboard } from './components/OwnerDashboard';
import { NotificationToast } from './components/NotificationToast';
import { AdminLoginModal } from './components/AdminLoginModal';
import { useAdminAuth } from './contexts/AdminAuthContext';
import { supabase } from './lib/supabase';
import { BackButton } from './components/BackButton';
import { BackgroundMusic } from './components/BackgroundMusic';
import { AppointmentBanner } from './components/AppointmentBanner';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SEOHead } from './components/SEOHead';
import { DeveloperCredits } from './components/DeveloperCredits';
import { Appointment, Service } from './types';
import { useSupabaseAppointments } from './hooks/useSupabaseAppointments';
import { useNotifications } from './hooks/useNotifications';
import { scheduleReminders } from './utils/webhooks';
import { X, RefreshCw, Calendar } from 'lucide-react';

if (import.meta.env.DEV) {
  void import('./utils/testWhatsApp');
}

function App() {
  const { isAdmin, signIn, signOut } = useAdminAuth();
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [view, setView] = useState<'customer' | 'owner'>('customer');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [navigationStack, setNavigationStack] = useState<('customer' | 'owner')[]>(['customer']);
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);

  const {
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    restoreAppointment,
    permanentlyDeleteAppointment,
    loadDeletedAppointments,
    refresh: refreshAppointments
  } = useSupabaseAppointments();
  const { notifications, addNotification, removeNotification } = useNotifications();

  useEffect(() => {
    if (!isAdmin) {
      setAdminAllowed(false);
      return;
    }
    supabase.rpc('is_barber_admin').then(({ data, error }) => {
      if (error || !data) {
        void signOut();
        setAdminAllowed(false);
      } else {
        setAdminAllowed(true);
      }
    });
  }, [isAdmin, signOut]);

  // Check for upcoming appointment on load and when appointments change
  useEffect(() => {
    const checkUpcomingAppointment = () => {
      const savedId = localStorage.getItem('upcoming_appointment_id');
      if (savedId) {
        // Find by exact ID match
        const found = appointments.find(apt => apt.id === savedId);

        if (found) {
          // Verify if it's still valid
          const isValidStatus = ['confirmed', 'pending'].includes(found.status);

          if (isValidStatus) {
            const savedName = localStorage.getItem('upcoming_appointment_name') || '';
            const savedPhone = localStorage.getItem('upcoming_appointment_phone') || '';
            const savedCompanionsRaw = localStorage.getItem('upcoming_appointment_companions');
            let savedCompanions: string[] = [];
            if (savedCompanionsRaw) {
              try {
                savedCompanions = JSON.parse(savedCompanionsRaw);
              } catch (e) {
                console.error(e);
              }
            }

            setUpcomingAppointment({
              ...found,
              customerName: savedName || found.customerName,
              customerPhone: savedPhone || found.customerPhone,
              additionalCustomerNames: savedCompanions.length > 0 ? savedCompanions : found.additionalCustomerNames,
            });
          } else {
            // If status is not valid (completed/cancelled), remove it
            localStorage.removeItem('upcoming_appointment_id');
            localStorage.removeItem('upcoming_appointment_name');
            localStorage.removeItem('upcoming_appointment_phone');
            localStorage.removeItem('upcoming_appointment_companions');
            setUpcomingAppointment(null);
          }
        } else {
          // If we have appointments loaded but didn't find the saved one,
          // it might have been deleted remotely?
          // Only clear if we are sure we have loaded the relevant appointments.
        }
      }
    };

    if (appointments.length > 0) {
      checkUpcomingAppointment();
    }
  }, [appointments]);

  const handleViewChange = (newView: 'customer' | 'owner') => {
    if (newView === 'owner' && !adminAllowed) {
      setShowLoginModal(true);
    } else {
      setNavigationStack(prev => [...prev, newView]);
      setView(newView);
      // Force immediate scroll to top
      window.scrollTo(0, 0);
      // Also try with smooth behavior as backup
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  };

  const handleAdminLoginSuccess = async () => {
    const { data: allowed, error } = await supabase.rpc('is_barber_admin');
    if (error || !allowed) {
      await signOut();
      setShowLoginModal(false);
      addNotification({
        type: 'error',
        title: 'Acceso denegado',
        message: 'Tu cuenta no está autorizada para el panel. Contactá al administrador.',
      });
      return;
    }
    setAdminAllowed(true);
    setNavigationStack(prev => [...prev, 'owner']);
    setView('owner');
    setShowLoginModal(false);
    // Force immediate scroll to top
    window.scrollTo(0, 0);
    // Also try with smooth behavior as backup
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handleLoginCancel = () => {
    setShowLoginModal(false);
  };


  const handleGoBack = () => {
    if (navigationStack.length > 1) {
      const newStack = [...navigationStack];
      newStack.pop(); // Remove current view
      const previousView = newStack[newStack.length - 1];
      setNavigationStack(newStack);
      setView(previousView);

      // If going back from owner view, reset authentication
      if (view === 'owner' && previousView === 'customer') {
        void signOut();
        setAdminAllowed(false);
      }
    } else {
      setView('customer');
      setNavigationStack(['customer']);
      void signOut();
      setAdminAllowed(false);
    }
  };
  const handleNewAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAppointment = await addAppointment(appointmentData);

      // Si estábamos reagendando, cancelamos el turno anterior
      const isResched = !!reschedulingAppointment;
      if (reschedulingAppointment) {
        try {
          await deleteAppointment(reschedulingAppointment.id, reschedulingAppointment.customerPhone);
        } catch (deleteError) {
          console.error('Error cancelando el turno anterior:', deleteError);
        }
      }

      // Save ID and details to local storage
      localStorage.setItem('upcoming_appointment_id', newAppointment.id);
      localStorage.setItem('upcoming_appointment_name', newAppointment.customerName);
      localStorage.setItem('upcoming_appointment_phone', newAppointment.customerPhone);
      if (newAppointment.additionalCustomerNames && newAppointment.additionalCustomerNames.length > 0) {
        localStorage.setItem('upcoming_appointment_companions', JSON.stringify(newAppointment.additionalCustomerNames));
      } else {
        localStorage.removeItem('upcoming_appointment_companions');
      }

      setUpcomingAppointment(newAppointment);
      setReschedulingAppointment(null);

      // Programar recordatorios automáticos (incluye confirmación inmediata)
      scheduleReminders(newAppointment);

      addNotification({
        type: 'success',
        title: isResched ? 'Turno Reagendado' : 'Turno Confirmado',
        message: (
          <div className="space-y-3 mt-2 text-left w-full">
            <p className="text-white/90 text-sm">
              {isResched 
                ? 'Tu turno ha sido cambiado con éxito.' 
                : `Tu reserva para ${newAppointment.service.name} ha sido confirmada.`}
            </p>
            <div className="bg-black/40 border border-white/10 rounded-md p-3.5 space-y-2">
              <div className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase text-center">
                {isResched ? 'Nuevo Horario' : 'Horario Reservado'}
              </div>
              <div className="text-white font-extrabold text-sm flex items-center gap-1.5 bg-white/5 py-1.5 px-2.5 rounded border border-white/5 justify-center">
                📅 {newAppointment.date.toUpperCase()}
              </div>
              <div className="text-emerald-300 font-black text-2xl flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 py-2 rounded">
                ⏰ {newAppointment.time} hs
              </div>
            </div>
          </div>
        )
      });
    } catch (error) {
      console.error('Error creating appointment:', error);

      // Mostrar mensaje específico si es un error de baneo
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const isBanError = errorMessage.includes('bloqueado') || errorMessage.includes('baneado');

      addNotification({
        type: 'error',
        title: isBanError ? 'Acceso Bloqueado' : 'Error',
        message: isBanError
          ? errorMessage
          : 'No se pudo crear el turno. Intenta nuevamente.'
      });
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const appointment = appointments.find(apt => apt.id === id);

    try {
      await deleteAppointment(id);

      // If the deleted appointment is the one tracked locally, remove it
      if (localStorage.getItem('upcoming_appointment_id') === id) {
        localStorage.removeItem('upcoming_appointment_id');
        setUpcomingAppointment(null);
      }

      if (appointment) {
        addNotification({
          type: 'info',
          title: 'Turno Eliminado',
          message: `El turno de ${appointment.customerName} ha sido eliminado.`
        });
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el turno. Intenta nuevamente.'
      });
    }
  };

  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const oldAppointment = appointments.find(apt => apt.id === id);

    try {
      await updateAppointment(id, updates);

      if (oldAppointment && updates.status && updates.status !== oldAppointment.status) {
        const statusMessages = {
          confirmed: 'confirmado',
          completed: 'marcado como completado',
          cancelled: 'cancelado',
          'no-show': 'marcado como no show'
        };

        addNotification({
          type: updates.status === 'completed' ? 'success' :
            updates.status === 'cancelled' ? 'warning' : 'info',
          title: 'Estado Actualizado',
          message: `El turno de ${oldAppointment.customerName} ha sido ${statusMessages[updates.status]}.`
        });
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el turno. Intenta nuevamente.'
      });
    }
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleStartRescheduling = () => {
    if (!upcomingAppointment) return;
    setReschedulingAppointment(upcomingAppointment);
    setSelectedService(upcomingAppointment.service);
    setShowManageModal(false);

    // Smooth scroll to selection section
    setTimeout(() => {
      const element = document.getElementById('customer-booking-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 350, behavior: 'smooth' });
      }
    }, 150);
  };

  const handleCancelClickFromManage = () => {
    setShowManageModal(false);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (enteredPhone?: string) => {
    if (!upcomingAppointment) return;

    const phoneToUse = upcomingAppointment.customerPhone || enteredPhone || '';

    if (!phoneToUse) {
      addNotification({
        type: 'error',
        title: 'Falta Teléfono',
        message: 'Por favor ingresá tu número de WhatsApp para cancelar.'
      });
      return;
    }

    // Guardar el servicio del turno actual antes de borrarlo
    const previousService = upcomingAppointment.service;

    setIsCancelling(true);
    try {
      await deleteAppointment(upcomingAppointment.id, phoneToUse);
      localStorage.removeItem('upcoming_appointment_id');
      localStorage.removeItem('upcoming_appointment_name');
      localStorage.removeItem('upcoming_appointment_phone');
      localStorage.removeItem('upcoming_appointment_companions');
      setUpcomingAppointment(null);
      setReschedulingAppointment(null);

      // Limpiar selección de servicio al cancelar definitivamente
      setSelectedService(null);

      setShowCancelModal(false);

      addNotification({
        type: 'info',
        title: 'Turno Cancelado',
        message: 'Tu turno ha sido cancelado con éxito.'
      });

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Hubo un problema al cancelar el turno.'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 relative">
      <SEOHead
        title={view === 'customer'
          ? 'WAVE Barbería Premium - Reserva tu Turno Online | Cortes y Diseños'
          : 'Panel de Administración - WAVE Barbería Premium'
        }
        description={view === 'customer'
          ? 'Reserva tu turno en WAVE Barbería Premium. Cortes clásicos, arreglo de barba y diseños personalizados. Sistema de reservas online fácil y rápido. Abierto viernes y sábados.'
          : 'Panel de administración de WAVE Barbería Premium. Gestiona turnos, reservas y configuraciones.'
        }
      />

      {/* Appointment Reminder Banner */}
      {view === 'customer' && upcomingAppointment && !reschedulingAppointment && (
        <AppointmentBanner
          appointment={upcomingAppointment}
          onCancel={() => setShowManageModal(true)}
        />
      )}

      {/* Rescheduling Active Banner */}
      {view === 'customer' && reschedulingAppointment && (
        <div className="bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-red-600/90 border-b border-orange-500/30 backdrop-blur-md shadow-lg sticky top-0 z-50 animate-slide-down">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2">
                <span className="animate-pulse bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                  Reagendando
                </span>
                <span className="text-sm font-medium">
                  Elegí un nuevo día y horario para tu turno de <strong className="text-amber-100">{reschedulingAppointment.service.name}</strong>.
                </span>
              </div>
              <button
                onClick={() => {
                  setReschedulingAppointment(null);
                  setSelectedService(null);
                  addNotification({
                    type: 'info',
                    title: 'Cambio Cancelado',
                    message: 'Se mantuvo tu turno original intacto.'
                  });
                }}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-all border border-white/10"
              >
                Cancelar cambio (Mantener turno)
              </button>
            </div>
          </div>
        </div>
      )}

      <Header view={view} onViewChange={handleViewChange} />

      {/* Back Button - Show when there's navigation history or not on initial customer view */}
      {(navigationStack.length > 1 || view === 'owner') && (
        <BackButton
          onClick={handleGoBack}
          label={view === 'owner' ? 'Volver a Reservas' : 'Volver'}
        />
      )}

      {view === 'customer' ? (
        <CustomerView
          appointments={appointments}
          onNewAppointment={handleNewAppointment}
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
          reschedulingAppointment={reschedulingAppointment}
        />
      ) : (
        <OwnerDashboard
          appointments={appointments}
          onDeleteAppointment={handleDeleteAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onNewAppointment={handleNewAppointment}
          onRestoreAppointment={restoreAppointment}
          onPermanentlyDeleteAppointment={permanentlyDeleteAppointment}
          loadDeletedAppointments={loadDeletedAppointments}
          onRefreshAppointments={refreshAppointments}
          addNotification={addNotification}
        />
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm space-y-3 pointer-events-auto">
            {notifications.map((notification) => (
              <NotificationToast
                key={notification.id}
                {...notification}
                onClose={removeNotification}
              />
            ))}
          </div>
        </div>
      )}

      {/* PIN Authentication Modal */}
      {showLoginModal && (
        <AdminLoginModal
          signIn={signIn}
          onSuccess={handleAdminLoginSuccess}
          onCancel={handleLoginCancel}
        />
      )}

      {/* Manage Appointment Modal */}
      {showManageModal && upcomingAppointment && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-950 border-2 border-purple-500/40 rounded-md max-w-sm w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center flex flex-col justify-between min-h-[480px]">
            {/* Ambient gradients */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-36 h-36 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-36 h-36 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <button 
              onClick={() => setShowManageModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex-1 flex flex-col justify-between space-y-6">
              {/* Header Icon + Title */}
              <div className="flex flex-col items-center">
                <div className="p-3.5 rounded-full bg-purple-900/20 border border-purple-500/30 mb-3 inline-flex">
                  <Calendar className="h-9 w-9 text-purple-400" />
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-wide">
                  Gestionar mi Turno
                </h3>
              </div>

              {/* Current Booking Info (Highly Highlighted) */}
              <div className="bg-gray-900 border-2 border-purple-500/30 rounded-md p-6 text-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500"></div>
                <p className="text-xs text-purple-400 font-extrabold uppercase tracking-widest mb-3">
                  Tu reserva actual
                </p>
                <div className="inline-flex items-center justify-center gap-2 text-white font-extrabold text-base mb-4 bg-white/5 py-1 px-3 rounded-md border border-white/5">
                  <span className="text-xl">{upcomingAppointment.service.icon}</span>
                  <span>{upcomingAppointment.service.name}</span>
                </div>
                
                <div className="space-y-2.5">
                  {/* Date Highlighted */}
                  <div className="text-white text-sm font-black tracking-wide bg-purple-950/40 border border-purple-500/20 py-2.5 rounded-md justify-center flex items-center gap-1.5">
                    📅 {upcomingAppointment.date.toUpperCase()}
                  </div>
                  {/* Time Highlighted */}
                  <div className="text-purple-300 text-3xl font-black tracking-widest bg-purple-500/10 border border-purple-500/30 py-3 rounded-md animate-pulse flex items-center justify-center gap-1.5">
                    ⏰ {upcomingAppointment.time} hs
                  </div>
                </div>
              </div>

              {/* Action Buttons (Spaced & Tall) */}
              <div className="space-y-4 pt-2">
                <button
                  onClick={handleStartRescheduling}
                  className="w-full py-4 px-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md font-bold shadow-lg shadow-purple-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 text-center"
                >
                  <span className="text-lg flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-pulse" /> Reagendar turno
                  </span>
                  <span className="text-xs text-purple-100 font-normal tracking-wide leading-snug">
                    Mantenemos tu turno actual 100% seguro
                  </span>
                </button>

                <button
                  onClick={handleCancelClickFromManage}
                  className="w-full py-3.5 px-4 bg-red-950/40 border border-red-500/30 hover:bg-red-950/60 text-red-200 hover:text-red-100 rounded-md font-bold transition-all flex flex-col items-center justify-center gap-1 text-center"
                >
                  <span className="text-sm uppercase tracking-wider">
                    Cancelar turno definitivamente
                  </span>
                  <span className="text-[10px] text-red-300/70 font-normal leading-normal">
                    Si no vas a poder asistir, por favor liberá el lugar
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        title="¿Cancelar turno definitivamente?"
        message={upcomingAppointment?.customerPhone 
          ? "¿Estás seguro que querés cancelar tu turno definitivamente? Esta acción no se puede deshacer y tu lugar quedará liberado."
          : "Para poder cancelar tu turno anterior de forma segura, ingresá tu número de WhatsApp registrado."}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
        isLoading={isCancelling}
        requirePhoneInput={upcomingAppointment ? !upcomingAppointment.customerPhone : false}
      />

      {/* Background Music */}
      <BackgroundMusic />

      <DeveloperCredits />
    </div>
  );
}

export default App;