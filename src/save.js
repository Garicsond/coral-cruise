import { CARS, COLORS } from './catalog.js';

const KEY = 'coral-cruise-save-v1';

const CAR_IDS = new Set(CARS.map((car) => car.id));
const COLOR_IDS = new Set(COLORS.map((color) => color.id));

function blank() {
  return {
    v: 1,
    cash: 0,
    cars: ['breeze'],
    colors: ['sand', 'foam'],
    car: 'breeze',
    color: 'sand',
    shells: [],
    cleared: [],
    muted: false,
  };
}

export function sanitize(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const cars = Array.isArray(data.cars) ? data.cars.filter((id) => CAR_IDS.has(id)) : [];
  if (!cars.includes('breeze')) cars.unshift('breeze');
  const colors = Array.isArray(data.colors) ? data.colors.filter((id) => COLOR_IDS.has(id)) : [];
  if (!colors.includes('sand')) colors.unshift('sand');
  if (!colors.includes('foam')) colors.push('foam');
  const shells = Array.isArray(data.shells)
    ? data.shells.filter((id) => typeof id === 'string')
    : [];
  const cleared = Array.isArray(data.cleared)
    ? data.cleared.filter((id) => typeof id === 'string')
    : [];
  const cash = Number.isFinite(data.cash) ? Math.max(0, Math.floor(data.cash)) : 0;
  return {
    v: 1,
    cash,
    cars,
    colors,
    car: cars.includes(data.car) ? data.car : 'breeze',
    color: colors.includes(data.color) ? data.color : 'sand',
    shells,
    cleared,
    muted: Boolean(data.muted),
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    return sanitize(JSON.parse(raw));
  } catch {
    return blank();
  }
}

export function writeSave(data) {
  const clean = sanitize(data);
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    // Private mode or a full disk: the session still plays.
  }
  return clean;
}
