/** Graphics presets. High stays sharp on a recent phone; Low drops resolution and shadows. */

export function detectQuality() {
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  if (memory <= 2 || cores <= 2) return 'low';
  return 'high';
}

export function resolveQuality(saved) {
  if (saved === 'high' || saved === 'low') return saved;
  return detectQuality();
}

export function presetFor(level) {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (level === 'low') {
    return {
      level: 'low',
      pixelRatioCap: 1,
      antialias: false,
      shadowSize: 512,
      shadowSoft: false,
      shadowExtent: 18,
      waterSegX: 16,
      waterSegY: 8,
      sky: false,
      anisotropy: 2,
    };
  }
  return {
    level: 'high',
    pixelRatioCap: coarse ? 1.25 : 2,
    antialias: !coarse,
    shadowSize: coarse ? 512 : 2048,
    shadowSoft: !coarse,
    shadowExtent: coarse ? 22 : 34,
    waterSegX: coarse ? 20 : 48,
    waterSegY: coarse ? 8 : 22,
    sky: true,
    anisotropy: coarse ? 4 : 8,
  };
}
