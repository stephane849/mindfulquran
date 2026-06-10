'use client';

import { useRouter } from 'next/navigation';

// TopAppBarMMD: 64dp bar closed by a 3dp divider, large back target, 20sp title
export function TopBar({
  title,
  right,
  progress,
}: {
  title: string;
  right?: React.ReactNode;
  progress?: string;
}) {
  const router = useRouter();
  return (
    <nav className="sticky top-0 z-10 bg-paper border-b-[3px] border-ink h-16 flex items-center gap-3 pl-4 pr-4">
      <button
        onClick={() => router.push('/')}
        aria-label="Back"
        className="text-2xl leading-none py-2 pr-2 -ml-1"
      >
        ←
      </button>
      <span className="text-xl font-bold truncate flex-1">{title}</span>
      {progress && (
        <span className="text-xs text-ink/60 shrink-0 whitespace-nowrap">{progress}</span>
      )}
      {right}
    </nav>
  );
}
