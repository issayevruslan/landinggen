export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>LP Runtime</h1>
      <p>This service will render generated landing pages from stored specs.</p>
      <p>POST events to <code>/api/track</code> from pages to record interactions.</p>
    </main>
  );
}


