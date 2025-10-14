import React from "react";

type Testimonial = { quote: string; author?: string; role?: string };

export function Testimonials({ items = [] as Testimonial[] }) {
  return (
    <section style={{ padding: '32px 24px' }}>
      <h2>Testimonials</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((t, i) => (
          <blockquote key={i} style={{ margin: 0, padding: 16, borderLeft: '4px solid #00A3E0', background: '#f7fbff' }}>
            <p style={{ margin: 0 }}>“{t.quote}”</p>
            {(t.author || t.role) && (
              <cite style={{ display: 'block', marginTop: 8, color: '#555' }}>{t.author}{t.role ? `, ${t.role}` : ''}</cite>
            )}
          </blockquote>
        ))}
      </div>
    </section>
  );
}


