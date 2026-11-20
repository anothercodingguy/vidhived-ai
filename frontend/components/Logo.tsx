/*
 * The one Vidhived logo: two concentric blue rings, optionally followed by
 * the serif wordmark. Used in every header and as the chat avatar.
 * app/icon.svg (the favicon) draws the same mark.
 */
export function LogoMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 text-primary ${className}`}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <circle cx="12" cy="12" r="3.75" stroke="currentColor" strokeWidth="2.25" />
    </svg>
  )
}

export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-serif text-[1.375rem] font-medium leading-none tracking-tight text-ink">Vidhived.ai</span>
    </span>
  )
}
