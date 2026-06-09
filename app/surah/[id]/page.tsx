import { Reader } from '@/components/Reader';

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SurahPage({ params }: Props) {
  const { id } = await params;
  return <Reader source="chapter" id={parseInt(id, 10)} />;
}
