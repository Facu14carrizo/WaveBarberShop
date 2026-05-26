import { Service } from '../types';

// Servicios por defecto (fallback)
export const defaultServices: Service[] = [
  {
    id: 'classic-cut',
    name: 'Corte Clásico',
    duration: 30,
    price: 14000,
    description: 'Corte con tijera y maquina tradicional, fade, etc.\n(incluye perfilado de barba y cejas).',
    icon: '✂️'
  },
  {
    id: 'beard-trim',
    name: 'Arreglo de Barba',
    duration: 20,
    price: 8000,
    description: 'Perfilado, reducción de volumen y arreglo de la barba con navaja, máquina y tijera. (Exclusivo para barba, no incluye corte de cabello)',
    icon: '🪒 '
  },
  {
    id: 'designs',
    name: 'Corte + Diseño',
    duration: 40,
    price: 15000,
    description: 'Diseño, líneas artísticas en el cabello: figuras, logos y detalles personalizados.',
    icon: '🎨'
  }
];

// Nota: Para usar servicios, importa y usa el hook useServices desde '../hooks/useServices'
// Este archivo solo exporta los servicios por defecto como referencia
