type IconProps = { size?: number; className?: string };

export function Check({ size = 16, className }: IconProps) {
  return (
    <svg className={className ?? 'inline-icon text-emerald-600 dark:text-emerald-400'} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-label="지원" role="img">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cross({ size = 16, className }: IconProps) {
  return (
    <svg className={className ?? 'inline-icon text-rose-600 dark:text-rose-400'} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-label="미지원" role="img">
      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 1.75h5.5L13 5.25v9H4a1 1 0 0 1-1-1v-10.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.5 1.75v3.5H13" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
