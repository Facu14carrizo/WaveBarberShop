import { useState } from 'react';
import { Header } from './components/Header';
import { CustomerView } from './components/CustomerView';
import { OwnerDashboard } from './components/OwnerDashboard';
import { NotificationToast } from './components/NotificationToast';
import { PinAuthModal } from './components/PinAuthModal';
import { BackButton } from './components/BackButton';
import { BackgroundMusic } from './components/BackgroundMusic';
import { Appointment } from './types';
import { useSupabaseAppointments } from './hooks/useSupabaseAppointments';
import { useNotifications } from './hooks/useNotifications';
import { sendToZapier, scheduleReminders } from './utils/webhooks';
import './utils/testWhatsApp'; // Funciones de prueba para WhatsApp

function App() {
  const [view, setView] = useState<'customer' | 'owner'>('customer');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [navigationStack, setNavigationStack] = useState<('customer' | 'owner')[]>(['customer']);
  const { 
    appointments, 
    addAppointment,
    updateAppointment,
    deleteAppointment
  } = useSupabaseAppointments();
  const { notifications, addNotification, removeNotification } = useNotifications();

  const handleViewChange = (newView: 'customer' | 'owner') => {
    if (newView === 'owner' && !isAuthenticated) {
      setShowPinModal(true);
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

  const handlePinSuccess = () => {
    setIsAuthenticated(true);
    setNavigationStack(prev => [...prev, 'owner']);
    setView('owner');
    setShowPinModal(false);
    // Force immediate scroll to top
    window.scrollTo(0, 0);
    // Also try with smooth behavior as backup
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
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
        setIsAuthenticated(false);
      }
    } else {
      // If no history, go to customer view
      setView('customer');
      setNavigationStack(['customer']);
      setIsAuthenticated(false);
    }
  };
  const handleNewAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const appointmentWithId = {
        ...appointmentData,
        id: Math.random().toString(36).substr(2, 9)
      };
      const newAppointment = await addAppointment(appointmentWithId);
      
      // Programar recordatorios automáticos (incluye confirmación inmediata)
      scheduleReminders(newAppointment);
      
      addNotification({
        type: 'success',
        title: 'Turno Confirmado',
        message: `Tu turno para ${newAppointment.service.name} el ${newAppointment.date} a las ${newAppointment.time} ha sido confirmado.`
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo crear el turno. Intenta nuevamente.'
      });
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const appointment = appointments.find(apt => apt.id === id);
    
    try {
      await deleteAppointment(id);
      
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

  return (
    <div className="min-h-screen bg-gray-900 relative">
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
        />
      ) : (
        <OwnerDashboard
          appointments={appointments}
          onDeleteAppointment={handleDeleteAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onNewAppointment={handleNewAppointment}
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
      {showPinModal && (
        <PinAuthModal
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}
      
      {/* Background Music */}
      <BackgroundMusic />
      
    </div>
  );
}

export default App;