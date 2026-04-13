// Minimal diagnostic page — no imports, no hooks, no client code
export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>OK: {id}</div>;
}
