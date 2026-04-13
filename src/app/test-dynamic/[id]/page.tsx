// Minimal test page — zero deps, pure Next.js
export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <html>
      <body>
        <h1>Test dynamic: {id}</h1>
        <p>Node: {process.version}</p>
      </body>
    </html>
  );
}
