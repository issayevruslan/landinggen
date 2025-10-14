import React from "react";

export function CTA({ text = "Get started" }) {
  return (
    <section style={{ padding: '48px 24px', textAlign: 'center' }}>
      <a href="#form" style={{ display: 'inline-block', background: '#00A3E0', color: '#fff', padding: '12px 18px', borderRadius: 6 }}>{text}</a>
    </section>
  );
}


