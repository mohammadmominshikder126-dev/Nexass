export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nxGrad" x1="4" y1="32" x2="36" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="55%" stopColor="#00D2FF" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <path
        d="M5 32L12.5 9H19L23.5 22L31 11L35 14L25.5 32H19.5L15 18.5L10.5 32H5Z"
        fill="url(#nxGrad)"
      />
      <path d="M27 9L39 4L36.5 16.5L32.5 12.5L27 9Z" fill="#FACC15" />
    </svg>
  );
}
