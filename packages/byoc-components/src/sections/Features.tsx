import React from "react";

export function Features({ items = [] as string[] }) {
  return (
    <section style={{ padding: '32px 24px' }}>
      <h2>Features</h2>
      <ul>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </section>
  );
}


