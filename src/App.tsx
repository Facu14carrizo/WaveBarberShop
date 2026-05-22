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
  const [isCancelling, setIsCancelling] = useState(false);

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
            setUpcomingAppointment(found);
          } else {
            // If status is not valid (completed/cancelled), remove it
            localStorage.removeItem('upcoming_appointment_id');
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

      // Save ID to local storage for reminder
      localStorage.setItem('upcoming_appointment_id', newAppointment.id);
      setUpcomingAppointment(newAppointment);

      // Programar recordatorios automáticos (incluye confirmación inmediata)
      scheduleReminders(newAppointment);

      addNotification({
        type: 'success',
        title: 'Turno Confirmado',
        message: `Tu turno para ${newAppointment.service.name} el ${newAppointment.date} a las ${newAppointment.time} ha sido confirmado.`
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

  const handleConfirmCancel = async () => {
    if (!upcomingAppointment) return;

    // Guardar el servicio del turno actual antes de borrarlo
    const previousService = upcomingAppointment.service;

    setIsCancelling(true);
    try {
      await deleteAppointment(upcomingAppointment.id, upcomingAppointment.customerPhone);
      localStorage.removeItem('upcoming_appointment_id');
      setUpcomingAppointment(null);

      // Auto-seleccionar el servicio para que el usuario elija nuevo horario directamente
      setSelectedService(previousService);

      setShowCancelModal(false);

      addNotification({
        type: 'info',
        title: 'Turno Cancelado',
        message: 'Tu turno ha sido cancelado. Selecciona un nuevo horario.'
      });

      // Smooth scroll to top to show slots
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

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
      {view === 'customer' && upcomingAppointment && (
        <AppointmentBanner
          appointment={upcomingAppointment}
          onCancel={handleCancelClick}
        />
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
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            {...notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      {/* PIN Authentication Modal */}
      {showLoginModal && (
        <AdminLoginModal
          signIn={signIn}
          onSuccess={handleAdminLoginSuccess}
          onCancel={handleLoginCancel}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        title="¿Cambiar turno?"
        message="¿Estás seguro que querés cambiar tu turno? El turno actual será cancelado para que puedas elegir uno nuevo."
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
        isLoading={isCancelling}
      />

      {/* Background Music */}
      <BackgroundMusic />

      <DeveloperCredits />
    </div>
  );
}

export default App;