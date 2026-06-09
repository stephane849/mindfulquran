import { Reader } from '@/components/Reader';

export function generateStaticParams() {
  return Array.from({ length: 30 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JuzPage({ params }: Props) {
  const { id } = await params;
  return <Reader source="juz" id={parseInt(id, 10)} />;
}
