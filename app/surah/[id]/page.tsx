import { SurahPageClient } from './SurahPageClient';

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SurahPage({ params }: Props) {
  const { id } = await params;
  return <SurahPageClient surahId={parseInt(id, 10)} />;
}
