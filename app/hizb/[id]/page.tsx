import { Reader } from '@/components/Reader';
import { prerenderHizb } from '@/lib/prerender';

export function generateStaticParams() {
  return Array.from({ length: 60 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HizbPage({ params }: Props) {
  const { id } = await params;
  const n = parseInt(id, 10);
  const prerendered = await prerenderHizb(n);
  return <Reader source="hizb" id={n} prerendered={prerendered} />;
}
