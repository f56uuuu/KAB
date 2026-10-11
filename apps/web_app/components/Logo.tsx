// The official KAP app icon — the same image everywhere (header, splash, admin, legal pages, store icons).
export function KMark({ size = 40, className = '' }: { size?: number; tile?: boolean; className?: string }) {
  const src = size > 128 ? '/brand/kap-icon-512.webp' : '/brand/kap-icon-256.webp';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    />
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
