"use client";
import { useMemo } from "react";

export default function PreviewPage({ searchParams }: any) {
  const spec = useMemo(() => {
    try {
      if (!searchParams?.spec) return null;
      const json = decodeURIComponent(escape(window.atob(searchParams.spec)));
      return JSON.parse(json);
    } catch (e) { return null; }
  }, [searchParams]);

  if (!spec) return <main style={{ padding: 24 }}>No spec.</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>{spec?.meta?.title || 'Preview'}</h1>
      <p>{spec?.meta?.description}</p>
      <hr />
      {(spec.sections || []).map((s: any, i: number) => (
        <section key={i} style={{ padding: 16, border: '1px solid #eee', marginBottom: 12 }}>
          <h3>{s.type}</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(s.data || {}, null, 2)}</pre>
        </section>
      ))}
    </main>
  );
}


