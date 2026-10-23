/**
 * Opções que o usuário pode escolher e o prompt enviado à IA.
 * Os rótulos (label) aparecem no site; os textos em inglês vão para o modelo.
 */

export const SCENARIOS = {
  'sunset-hills': {
    label: 'Pôr do sol na metrópole',
    description: 'Palmeiras, colinas e céu roxo-alaranjado',
    prompt:
      'a sprawling Southern California style metropolis at a purple and orange sunset, rows of tall palm trees, hills in the distance, a helicopter in the sky and a sleek sports car parked behind the character',
  },
  'neon-beach': {
    label: 'Praia neon anos 80',
    description: 'Avenida à beira-mar com neon rosa e ciano',
    prompt:
      'a 1980s Miami-style beachfront boulevard at dusk, pastel art deco buildings glowing with pink and cyan neon, palm trees and a classic convertible',
  },
  'hood-90s': {
    label: 'Bairro anos 90',
    description: 'Rua ensolarada da costa oeste com lowrider',
    prompt:
      'a sunny 1990s West Coast neighborhood street, small houses, a lowrider car, palm trees and warm hazy afternoon light',
  },
  downtown: {
    label: 'Centro financeiro',
    description: 'Arranha-céus de vidro sob céu azul',
    prompt:
      'a downtown financial district with glass skyscrapers under a dramatic deep-blue evening sky',
  },
  'desert-road': {
    label: 'Estrada no deserto',
    description: 'Rodovia, mesas rochosas e muscle car',
    prompt:
      'an open desert highway with red rock mesas, a dusty muscle car and a hot orange sky',
  },
};

export const STYLES = {
  cover: {
    label: 'Capa clássica',
    prompt: 'bold cover-art panel, heroic three-quarter pose, upper body framing',
  },
  loading: {
    label: 'Tela de carregamento',
    prompt: 'full-bleed loading-screen illustration with cinematic wide composition and dramatic perspective',
  },
  noir: {
    label: 'Noturno',
    prompt: 'night-time version lit by street lamps and neon reflections, high contrast and deep shadows',
  },
};

export const FORMATS = {
  portrait: { label: 'Retrato', size: '1024x1536' },
  square: { label: 'Quadrado', size: '1024x1024' },
  landscape: { label: 'Paisagem', size: '1536x1024' },
};

export const DEFAULTS = { scenario: 'sunset-hills', style: 'cover', format: 'portrait' };

export function buildPrompt({ scenario, style }) {
  const scene = SCENARIOS[scenario] ?? SCENARIOS[DEFAULTS.scenario];
  const look = STYLES[style] ?? STYLES[DEFAULTS.style];

  return [
    'Transform the person in the photo into a hand-painted illustrated character in the style of classic Grand Theft Auto cover art and loading screens:',
    'thick clean ink outlines, cel-shaded painterly lighting, saturated colors, slightly stylized proportions and a confident attitude.',
    "Keep the person clearly recognizable: preserve their facial structure, skin tone, hairstyle, facial hair, glasses, accessories and distinctive features.",
    `Setting: ${scene.prompt}.`,
    `Treatment: ${look.prompt}.`,
    'The character is the clear focal point of the image.',
    'Do not include any text, letters, logos, game titles, watermarks, brand names or signs with readable words.',
    'Keep clothing appropriate and the image non-explicit.',
  ].join(' ');
}

export function publicOptions() {
  const pick = (obj) =>
    Object.entries(obj).map(([id, v]) => ({ id, label: v.label, description: v.description }));
  return { scenarios: pick(SCENARIOS), styles: pick(STYLES), formats: pick(FORMATS), defaults: DEFAULTS };
}
