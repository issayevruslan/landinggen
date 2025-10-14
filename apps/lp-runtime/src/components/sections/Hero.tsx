"use client";
import React from "react";

export function Hero({ headline, sub, cta, slug }: { headline?: string; sub?: string; cta?: string; slug?: string }) {
  return (
    <section style={{ padding: '64px 24px', textAlign: 'center', background: '#f6f8fa' }}>
      <h1 style={{ marginBottom: 8 }}>{headline}</h1>
      {sub && <p style={{ color: '#555', marginBottom: 16 }}>{sub}</p>}
      {cta && (
        <a
          href="#form"
          onClick={async (e) => {
            try {
              await fetch('/api/track', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ type: 'cta_click', slug: slug || '', meta: { button: 'hero' } })
              });
            } catch {}
          }}
          style={{ display: 'inline-block', background: '#0033A0', color: '#fff', padding: '10px 16px', borderRadius: 6 }}
        >
          {cta}
        </a>
      )}
    </section>
  );
}


