// The KAP "K": silver stem and leg, yellow diagonal arm — redrawn as SVG from the brand icon.
export function KMark({ size = 40, tile = true, className = '' }: { size?: number; tile?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="kap-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#C9C9CC" />
        </linearGradient>
      </defs>
      {tile && <rect width="100" height="100" rx="24" fill="#0D0D0F" />}
      <path d="M31 28 Q43 25 44 33 L44 67 L31 77 Z" fill="url(#kap-silver)" />
      <path d="M41 55 L67 30 L82 30 L44 66 Z" fill="#FFD100" />
      <path d="M53 52 L60 47 L80 71 Q76 74 70 74 Z" fill="url(#kap-silver)" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 font-black tracking-tight ${className}`} dir="ltr">
      <span>KAP</span>
      <span className="font-extrabold">كاب</span>
    </span>
  );
}

export function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <KMark size={size} />
      <Wordmark className="text-xl" />
    </span>
  );
}
