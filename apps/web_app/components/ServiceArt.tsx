// Illustrations for KAP services, drawn in SVG (light from the top left, soft floor shadow)
// so they stay sharp at any size and need no image downloads.

export type ArtKind = 'taxi' | 'scooter' | 'burger' | 'bags' | 'pharmacy' | 'gift' | 'home' | 'car';

type P = { className?: string; uid?: string };

function Shadow({ cx = 60, cy = 84, rx = 40 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={5} fill="#000" opacity=".35" />;
}

function Taxi({ className, uid = 't' }: P) {
  const y = `${uid}y`, w = `${uid}w`, g = `${uid}g`, l = `${uid}l`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={y} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#F0B000" />
        </linearGradient>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4B5568" />
          <stop offset="1" stopColor="#141820" />
        </linearGradient>
        <radialGradient id={l} cx=".5" cy=".5" r=".6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFE9A0" />
        </radialGradient>
        <linearGradient id={w} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Shadow cy={85} rx={48} />
      <rect x="15" y="70" width="15" height="13" rx="4" fill="#15151A" />
      <rect x="90" y="70" width="15" height="13" rx="4" fill="#15151A" />
      <path d="M29 47 L39 24 Q41 19 47 19 H73 Q79 19 81 24 L91 47 Z" fill={`url(#${y})`} />
      <path d="M35 46 L43 27 Q44 24 48 24 H72 Q76 24 77 27 L85 46 Z" fill={`url(#${g})`} />
      <path d="M45 27 L56 27 L48 46 L37 46 Z" fill={`url(#${w})`} opacity=".6" />
      <rect x="47" y="10" width="26" height="10" rx="3" fill="#0D0D0F" />
      <text x="60" y="17.6" textAnchor="middle" fontSize="7" fontWeight="700" fill="#FFD100" fontFamily="Readex Pro, Tahoma, sans-serif">
        KAP
      </text>
      <ellipse cx="25" cy="47" rx="5" ry="3" fill="#E9A800" />
      <ellipse cx="95" cy="47" rx="5" ry="3" fill="#E9A800" />
      <rect x="9" y="44" width="102" height="32" rx="13" fill={`url(#${y})`} />
      <path d="M20 47 H100 Q106 47 107 52 Q90 49 60 49 Q30 49 13 52 Q14 47 20 47 Z" fill="#fff" opacity=".35" />
      <rect x="15" y="53" width="21" height="9" rx="4.5" fill={`url(#${l})`} />
      <rect x="84" y="53" width="21" height="9" rx="4.5" fill={`url(#${l})`} />
      <rect x="42" y="56" width="36" height="8" rx="4" fill="#1B1B21" />
      <path d="M46 60 H74" stroke="#3A3A44" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="12" y="67" width="96" height="8" rx="4" fill="#1B1B21" />
      <rect x="50" y="68.5" width="20" height="5" rx="1.5" fill="#F2F2F2" />
    </svg>
  );
}

function Scooter({ className, uid = 's' }: P) {
  const y = `${uid}y`, b = `${uid}b`, bt = `${uid}bt`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={y} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#EDA900" />
        </linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC94A" />
          <stop offset="1" stopColor="#E58F00" />
        </linearGradient>
        <linearGradient id={bt} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#FFC94A" />
        </linearGradient>
      </defs>
      <Shadow cy={85} rx={46} />
      <circle cx="28" cy="72" r="12" fill="#15151A" />
      <circle cx="28" cy="72" r="5" fill="#A6ABB3" />
      <circle cx="92" cy="72" r="12" fill="#15151A" />
      <circle cx="92" cy="72" r="5" fill="#A6ABB3" />
      <path d="M33 70 Q30 52 44 50 L70 50 Q78 50 82 56 L92 66 Q95 71 89 72 H38 Q34 72 33 70 Z" fill={`url(#${y})`} />
      <path d="M44 53 H70 Q75 53 78 57" stroke="#fff" strokeOpacity=".45" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 52 L33 26" stroke="#24242B" strokeWidth="5" strokeLinecap="round" />
      <path d="M26 25 H40" stroke="#24242B" strokeWidth="5" strokeLinecap="round" />
      <circle cx="35" cy="34" r="4.5" fill="#FFF3C2" stroke="#24242B" strokeWidth="2" />
      <rect x="58" y="42" width="28" height="9" rx="4.5" fill="#1B1B21" />
      <path d="M64 15 L98 15 L102 21 L68 21 Z" fill={`url(#${bt})`} />
      <rect x="64" y="20" width="38" height="24" rx="3" fill={`url(#${b})`} />
      <path d="M82 20 V44" stroke="#C97A00" strokeWidth="3" />
      <rect x="69" y="27" width="8" height="5" rx="1.5" fill="#fff" opacity=".7" />
    </svg>
  );
}

function Burger({ className, uid = 'b' }: P) {
  const top = `${uid}t`, bot = `${uid}o`, pat = `${uid}p`, let_ = `${uid}l`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={top} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC970" />
          <stop offset="1" stopColor="#D9832A" />
        </linearGradient>
        <linearGradient id={bot} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2A948" />
          <stop offset="1" stopColor="#C46F22" />
        </linearGradient>
        <linearGradient id={pat} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A4425" />
          <stop offset="1" stopColor="#3D200F" />
        </linearGradient>
        <linearGradient id={let_} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD14F" />
          <stop offset="1" stopColor="#4C9A2A" />
        </linearGradient>
      </defs>
      <Shadow cy={84} rx={42} />
      <path d="M22 68 H98 Q98 81 85 81 H35 Q22 81 22 68 Z" fill={`url(#${bot})`} />
      <rect x="18" y="56" width="84" height="13" rx="6.5" fill={`url(#${pat})`} />
      <path d="M19 55 H101 L96 62 L88 57 L80 63 L72 57 L64 62 L56 57 L48 63 L40 57 L32 62 L24 57 Z" fill="#FFCC00" />
      <rect x="23" y="47" width="74" height="7" rx="3.5" fill="#E8453C" />
      <path d="M17 47 Q22 42 27 47 Q32 42 37 47 Q42 42 47 47 Q52 42 57 47 Q62 42 67 47 Q72 42 77 47 Q82 42 87 47 Q92 42 97 47 Q101 44 103 47 L101 51 H19 Z" fill={`url(#${let_})`} />
      <path d="M19 45 Q19 15 60 15 Q101 15 101 45 Z" fill={`url(#${top})`} />
      <ellipse cx="44" cy="25" rx="13" ry="5" fill="#fff" opacity=".28" />
      {[
        [40, 30, -20],
        [55, 23, 10],
        [70, 29, -10],
        [83, 35, 25],
        [50, 36, 30],
        [64, 37, -25],
      ].map(([x, yy, r], i) => (
        <ellipse key={i} cx={x} cy={yy} rx="2.6" ry="1.4" fill="#FFF4D6" transform={`rotate(${r} ${x} ${yy})`} />
      ))}
    </svg>
  );
}

function Bags({ className, uid = 'g' }: P) {
  const y = `${uid}y`, d = `${uid}d`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={y} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#EBA400" />
        </linearGradient>
        <linearGradient id={d} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3A42" />
          <stop offset="1" stopColor="#111115" />
        </linearGradient>
      </defs>
      <Shadow cy={84} rx={42} />
      <path d="M70 34 Q70 20 80 20 Q90 20 90 34" stroke="#2A2A31" strokeWidth="4" fill="none" />
      <path d="M60 34 H100 L103 80 H57 Z" fill={`url(#${d})`} />
      <path d="M38 30 Q38 12 52 12 Q66 12 66 30" stroke="#B57E00" strokeWidth="4.5" fill="none" />
      <path d="M24 30 H80 L84 82 H20 Z" fill={`url(#${y})`} />
      <path d="M24 30 H80 L80.6 37 H23.4 Z" fill="#fff" opacity=".35" />
      <path d="M30 40 L28 76" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="36" r="2.4" fill="#8A5F00" />
      <circle cx="66" cy="36" r="2.4" fill="#8A5F00" />
    </svg>
  );
}

function Pharmacy({ className, uid = 'p' }: P) {
  const d = `${uid}d`, y = `${uid}y`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={d} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3A42" />
          <stop offset="1" stopColor="#121216" />
        </linearGradient>
        <linearGradient id={y} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#EBA400" />
        </linearGradient>
      </defs>
      <Shadow cy={84} rx={42} />
      <rect x="30" y="18" width="52" height="64" rx="8" fill={`url(#${d})`} />
      <rect x="30" y="18" width="52" height="12" rx="6" fill="#4A4A54" />
      <rect x="49" y="40" width="14" height="32" rx="3" fill={`url(#${y})`} />
      <rect x="40" y="49" width="32" height="14" rx="3" fill={`url(#${y})`} />
      <g transform="rotate(-35 86 64)">
        <rect x="70" y="56" width="34" height="16" rx="8" fill="#F4F4F6" />
        <path d="M87 56 H96 A8 8 0 0 1 96 72 H87 Z" fill={`url(#${y})`} />
        <rect x="74" y="59" width="10" height="3" rx="1.5" fill="#fff" />
      </g>
    </svg>
  );
}

function Gift({ className, uid = 'f' }: P) {
  const d = `${uid}d`, y = `${uid}y`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={d} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3C3C45" />
          <stop offset="1" stopColor="#101014" />
        </linearGradient>
        <linearGradient id={y} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#E3A000" />
        </linearGradient>
      </defs>
      <Shadow cy={85} rx={42} />
      <path d="M58 30 Q40 6 30 18 Q24 28 58 32 Z" fill={`url(#${y})`} />
      <path d="M62 30 Q80 6 90 18 Q96 28 62 32 Z" fill={`url(#${y})`} />
      <rect x="25" y="46" width="70" height="36" rx="5" fill={`url(#${d})`} />
      <rect x="20" y="32" width="80" height="17" rx="5" fill={`url(#${d})`} />
      <path d="M22 34 H98" stroke="#fff" strokeOpacity=".18" strokeWidth="3" strokeLinecap="round" />
      <rect x="53" y="32" width="14" height="50" fill={`url(#${y})`} />
      <rect x="55" y="32" width="4" height="50" fill="#fff" opacity=".3" />
      <circle cx="60" cy="31" r="6" fill="#F5B800" />
    </svg>
  );
}

function House({ className, uid = 'h' }: P) {
  const d = `${uid}d`, y = `${uid}y`, s = `${uid}s`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={d} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A5D66" />
          <stop offset="1" stopColor="#2B2D33" />
        </linearGradient>
        <linearGradient id={y} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#E3A000" />
        </linearGradient>
        <linearGradient id={s} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#B9BEC7" />
        </linearGradient>
      </defs>
      <Shadow cy={85} rx={44} />
      <path d="M28 46 L60 22 L92 46 V82 H28 Z" fill={`url(#${d})`} />
      <path d="M14 48 L60 13 L106 48" stroke={`url(#${y})`} strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="80" y="18" width="9" height="16" rx="2" fill={`url(#${y})`} />
      <g transform="rotate(-40 60 62)">
        <rect x="56" y="48" width="8" height="34" rx="4" fill={`url(#${s})`} />
        <path d="M51 44 A10 10 0 1 0 69 44 L65 44 L65 50 L55 50 L55 44 Z" fill={`url(#${s})`} />
      </g>
    </svg>
  );
}

function CarFix({ className, uid = 'c' }: P) {
  const m = `${uid}m`, y = `${uid}y`, g = `${uid}g`;
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden>
      <defs>
        <linearGradient id={m} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9ECF0" />
          <stop offset="1" stopColor="#8E959F" />
        </linearGradient>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4B5568" />
          <stop offset="1" stopColor="#141820" />
        </linearGradient>
        <linearGradient id={y} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#E3A000" />
        </linearGradient>
      </defs>
      <Shadow cy={85} rx={46} />
      <path d="M10 66 Q10 52 22 50 L34 48 L44 36 Q47 32 53 32 H76 Q82 32 86 37 L95 48 L104 50 Q112 52 112 62 V70 H10 Z" fill={`url(#${m})`} />
      <path d="M47 38 Q49 36 53 36 H62 V48 H38 Z" fill={`url(#${g})`} />
      <path d="M66 36 H76 Q80 36 83 40 L90 48 H66 Z" fill={`url(#${g})`} />
      <path d="M14 56 H108" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
      <circle cx="32" cy="71" r="10" fill="#15151A" />
      <circle cx="32" cy="71" r="4" fill="#A6ABB3" />
      <circle cx="90" cy="71" r="10" fill="#15151A" />
      <circle cx="90" cy="71" r="4" fill="#A6ABB3" />
      <rect x="104" y="56" width="7" height="5" rx="2" fill="#FFF3C2" />
      <g transform="rotate(35 92 30)">
        <rect x="88" y="16" width="9" height="40" rx="4.5" fill={`url(#${y})`} />
        <path d="M82 13 A11 11 0 1 0 103 13 L98 13 L98 20 L87 20 L87 13 Z" fill={`url(#${y})`} />
      </g>
    </svg>
  );
}

const MAP: Record<ArtKind, (p: P) => JSX.Element> = {
  taxi: Taxi,
  scooter: Scooter,
  burger: Burger,
  bags: Bags,
  pharmacy: Pharmacy,
  gift: Gift,
  home: House,
  car: CarFix,
};

/** One service illustration. `uid` keeps gradient ids unique when the same art appears twice on a page. */
export function ServiceArt({ kind, className, uid }: { kind: ArtKind; className?: string; uid?: string }) {
  const C = MAP[kind];
  return <C className={className} uid={uid ?? kind} />;
}
