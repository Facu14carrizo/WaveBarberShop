import { Service } from '../types';

export const services: Service[] = [
  {
    id: 'classic-cut',
    name: 'Corte Clásico',
    duration: 30,
    price: 10000,
    description: 'Corte tradicional con tijera y máquina. Perfilado de cejas y barba.',
    icon: '✂️'
  },
  {
    id: 'beard-trim',
    name: 'Arreglo de Barba',
    duration: 20,
    price: 5000,
    description: 'Perfilado, reducción de volumen y arreglo de la barba con navaja, máquina y tijera.',
    icon: '🧔'
  },
  {
    id: 'designs',
    name: 'Diseños',
    duration: 40,
    price: 12000,
    description: 'Corte y diseño, líneas artísticas en el cabello: figuras, logos y detalles personalizados.',
    icon: '🎨'
  }
];
