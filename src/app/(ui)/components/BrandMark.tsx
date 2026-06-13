/** CasePilot mark — scales of justice in a claret tile. Matches the favicon (app/icon.svg). */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--claret)" />
      <g
        fill="none"
        stroke="var(--paper)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 7.6V23.4" />
        <path d="M11 24.4h10" />
        <path d="M8.4 11h15.2" />
        <path d="M8.4 11l-2.3 4.4h4.6z" />
        <path d="M23.6 11l-2.3 4.4h4.6z" />
      </g>
      <circle cx="16" cy="7.4" r="1.5" fill="var(--paper)" />
    </svg>
  );
}
