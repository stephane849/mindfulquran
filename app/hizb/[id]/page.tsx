import { Reader } from '@/components/Reader';

export function generateStaticParams() {
  return Array.from({ length: 60 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HizbPage({ params }: Props) {
  const { id } = await params;
  return <Reader source="hizb" id={parseInt(id, 10)} />;
}
