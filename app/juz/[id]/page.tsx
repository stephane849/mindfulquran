import { Reader } from '@/components/Reader';
import { prerenderJuz } from '@/lib/prerender';

export function generateStaticParams() {
  return Array.from({ length: 30 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JuzPage({ params }: Props) {
  const { id } = await params;
  const n = parseInt(id, 10);
  const prerendered = await prerenderJuz(n);
  return <Reader source="juz" id={n} prerendered={prerendered} />;
}
