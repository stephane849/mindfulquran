import Link from 'next/link';

// TopAppBarMMD: 64dp bar closed by a 3dp divider, large back target, 20sp title
export function TopBar({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <nav className="sticky top-0 z-10 bg-paper border-b-[3px] border-ink h-16 flex items-center gap-3 px-4">
      <Link href="/" aria-label="Back" className="text-2xl leading-none py-2 pr-2 -ml-1">
        ←
      </Link>
      <span className="text-xl font-bold truncate flex-1">{title}</span>
      {right}
    </nav>
  );
}
