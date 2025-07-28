import { Service } from '../types';

export const services: Service[] = [
  {
    id: 'classic-cut',
    name: 'Corte Clásico',
    duration: 30,
    price: 10000,
    description: 'Corte tradicional con tijera y máquina, incluye lavado',
    icon: '✂️'
  },
  {
    id: 'beard-trim',
    name: 'Arreglo de Barba',
    duration: 20,
    price: 5000,
    description: 'Perfilado y arreglo de barba con navaja',
    icon: '🧔'
  },
  {
    id: 'complete-service',
    name: 'Servicio Completo',
    duration: 45,
    price: 14000,
    description: 'Corte + barba + lavado + peinado',
    icon: '💫'
  },
  {
    id: 'kids-cut',
    name: 'Corte Infantil',
    duration: 25,
    price: 7000,
    description: 'Corte especial para niños hasta 12 años',
    icon: '👶'
  }
];