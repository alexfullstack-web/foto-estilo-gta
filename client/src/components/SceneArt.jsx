import { useId } from 'react';

/**
 * Cenário ilustrado em SVG (original), usado como arte de destaque e
 * nos cards de cenários. Não usa nenhuma imagem/logo de terceiros.
 */
const PALETTES = {
  'sunset-hills': {
    sky: ['#24104f', '#6a23c9', '#e63a8f', '#ff9a4a'],
    sun: ['#ffe08a', '#ff7a59'],
    far: '#4a1d6b', city: '#1d0b38', near: '#12061f', ground: '#0d0418', lights: '#ffcf7a',
  },
  'neon-beach': {
    sky: ['#140a36', '#4b1f86', '#ff4f9a', '#ffc2d6'],
    sun: ['#fff1a8', '#ff6fb1'],
    far: '#2a1360', city: '#1b0f45', near: '#0e0626', ground: '#0f6e8c', lights: '#5ff3ff',
  },
  'hood-90s': {
    sky: ['#1f5b80', '#4fa3c4', '#f4b860', '#fbe2a0'],
    sun: ['#fff6cc', '#ffbf5e'],
    far: '#6b4a6f', city: '#3a2a46', near: '#1a1222', ground: '#2b1d26', lights: '#ffe7a3',
  },
  downtown: {
    sky: ['#040a26', '#0f2f7a', '#2b63d4', '#86aaff'],
    sun: ['#d9e6ff', '#7aa2ff'],
    far: '#1a2a66', city: '#0a1440', near: '#050a24', ground: '#040818', lights: '#9fd0ff',
  },
  'desert-road': {
    sky: ['#2c0a0a', '#8f2a15', '#ee6a1f', '#ffc24a'],
    sun: ['#fff0b0', '#ff8a2a'],
    far: '#7a2c1c', city: '#4a1a12', near: '#24090a', ground: '#3a160e', lights: '#ffd27a',
  },
};

const BUILDINGS = [
  [150, 46, 14], [166, 70, 12], [180, 58, 16], [198, 92, 13], [213, 76, 18], [233, 110, 12],
  [247, 64, 15], [264, 84, 13], [279, 52, 16], [297, 72, 12], [311, 44, 14],
];

export default function SceneArt({ scene = 'sunset-hills', heli = true, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const p = PALETTES[scene] ?? PALETTES['sunset-hills'];
  const tall = scene === 'downtown';
  const desert = scene === 'desert-road';
  const beach = scene === 'neon-beach';

  return (
    <svg
      className={`scene-art ${className}`}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Ilustração de cenário urbano ao entardecer"
    >
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          {p.sky.map((c, i) => (
            <stop key={c} offset={i / (p.sky.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={`sun${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sun[0]} />
          <stop offset="1" stopColor={p.sun[1]} />
        </linearGradient>
        <mask id={`stripes${uid}`}>
          <rect width="400" height="300" fill="#fff" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="0" y={150 + i * 9} width="400" height={2 + i * 1.2} fill="#000" />
          ))}
        </mask>
        <symbol id={`palm${uid}`} viewBox="0 0 60 120">
          <path d="M30 120 C33 92 27 62 31 34" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          {[
            'M31 34 C20 26 10 28 2 38',
            'M31 34 C22 18 12 14 3 17',
            'M31 34 C31 20 29 11 25 3',
            'M31 34 C36 19 44 12 55 11',
            'M31 34 C43 26 52 28 59 38',
          ].map((d) => (
            <path key={d} d={d} stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
          ))}
        </symbol>
      </defs>

      <rect width="400" height="300" fill={`url(#sky${uid})`} />
      <circle cx="270" cy="150" r="58" fill={`url(#sun${uid})`} mask={`url(#stripes${uid})`} opacity="0.95" />

      {heli && (
        <g fill={p.near} transform="translate(300 52) scale(0.9)">
          <rect x="-26" y="-3" width="52" height="2" rx="1" />
          <path d="M-12 2 h20 a10 8 0 0 1 0 16 h-14 a8 8 0 0 1 -6 -16z" />
          <path d="M8 8 l34 -4 l0 4 l-32 6z" />
          <rect x="-8" y="20" width="22" height="2" />
        </g>
      )}

      {/* Morros / mesas ao fundo */}
      {desert ? (
        <path d="M0 200 L40 200 L52 150 L120 150 L132 200 L250 200 L262 168 L330 168 L344 200 L400 200 L400 300 L0 300Z" fill={p.far} />
      ) : (
        <path d="M0 190 C60 150 110 160 160 175 C220 192 260 150 320 158 C360 164 385 175 400 182 L400 300 L0 300Z" fill={p.far} />
      )}

      {/* Prédios */}
      {!desert && (
        <g fill={p.city}>
          {BUILDINGS.map(([x, h, w], i) => {
            const height = tall ? h * 1.7 : h;
            return (
              <g key={x}>
                <rect x={x} y={215 - height} width={w} height={height} />
                {i % 3 === 0 && <rect x={x + w / 2 - 1} y={205 - height} width="2" height="10" />}
                {Array.from({ length: Math.floor(height / 14) }).map((_, j) => (
                  <rect key={j} x={x + 3} y={220 - height + j * 14} width={w - 6} height="2" fill={p.lights} opacity={(i + j) % 3 ? 0.18 : 0.55} />
                ))}
              </g>
            );
          })}
        </g>
      )}

      {/* Chão / mar / estrada */}
      <rect x="0" y="214" width="400" height="86" fill={p.ground} />
      {beach && (
        <g stroke="#ffffff" strokeOpacity="0.25">
          <line x1="20" y1="232" x2="140" y2="232" />
          <line x1="200" y1="246" x2="380" y2="246" />
          <line x1="60" y1="262" x2="230" y2="262" />
        </g>
      )}
      {desert && (
        <path d="M170 300 L196 214 L204 214 L230 300Z" fill="#1a0806" opacity="0.8" />
      )}
      <path d="M0 250 C100 240 300 240 400 252 L400 300 L0 300Z" fill={p.near} />

      {/* Palmeiras */}
      <g color={p.near}>
        <use href={`#palm${uid}`} x="-6" y="70" width="90" height="190" />
        <use href={`#palm${uid}`} x="58" y="110" width="60" height="130" />
        <use href={`#palm${uid}`} x="330" y="88" width="80" height="170" />
        {!desert && <use href={`#palm${uid}`} x="296" y="128" width="46" height="100" />}
      </g>
    </svg>
  );
}
