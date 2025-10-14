import React from "react";

export function Benefits({ items = [] as string[] }) {
  return (
    <section style={{ padding: '32px 24px', background: '#fafafa' }}>
      <h2>Benefits</h2>
      <ul>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </section>
  );
}


