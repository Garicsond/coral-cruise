/** Original cars and paints. No real-world brands. */

export const CARS = [
  {
    id: 'breeze',
    name: 'Breeze',
    price: 0,
    accel: 16,
    max: 20,
    reverse: 7,
    brake: 34,
    coast: 11,
    turn: 2.2,
    radius: 1.36,
    blurb: 'Open-air cruiser. Easy and friendly.',
  },
  {
    id: 'sundart',
    name: 'Sundart',
    price: 400,
    accel: 22,
    max: 26,
    reverse: 8,
    brake: 36,
    coast: 8,
    turn: 2.4,
    radius: 1.42,
    blurb: 'A quick little fastback for the causeway.',
  },
  {
    id: 'palmetto',
    name: 'Palmetto',
    price: 800,
    accel: 13,
    max: 17.5,
    reverse: 6.5,
    brake: 30,
    coast: 9,
    turn: 1.9,
    radius: 1.55,
    blurb: 'Room for the whole family and a surfboard.',
  },
];

export const COLORS = [
  { id: 'sand', name: 'Sand Dollar', hex: '#f0d3a0', price: 0 },
  { id: 'foam', name: 'Foam', hex: '#f6f3ec', price: 0 },
  { id: 'coral', name: 'Coral', hex: '#ff8d7a', price: 80 },
  { id: 'seafoam', name: 'Seafoam', hex: '#7ee0c8', price: 80 },
  { id: 'lagoon', name: 'Lagoon', hex: '#4aa3ef', price: 120 },
  { id: 'mango', name: 'Mango', hex: '#ffb703', price: 120 },
  { id: 'lilac', name: 'Lilac', hex: '#d7b4f3', price: 140 },
  { id: 'palm', name: 'Palm', hex: '#67c56f', price: 140 },
];

export const SHELL_VALUE = 25;

export function carById(id) {
  return CARS.find((car) => car.id === id) || CARS[0];
}

export function colorById(id) {
  return COLORS.find((color) => color.id === id) || COLORS[0];
}
