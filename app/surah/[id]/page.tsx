import { Reader } from '@/components/Reader';
import { prerenderChapter } from '@/lib/prerender';

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SurahPage({ params }: Props) {
  const { id } = await params;
  const n = parseInt(id, 10);
  const prerendered = await prerenderChapter(n);
  return <Reader source="chapter" id={n} prerendered={prerendered} />;
}
