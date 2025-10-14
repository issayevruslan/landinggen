"use client";
import React, { useState } from "react";

type Field = { name: string; label: string; type: string; required?: boolean };

export function FormSection({ fields = [] as Field[], slug }: { fields?: Field[]; slug?: string }) {
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget) as any);
    setSubmitting(true);
    setStatus("");
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, ...data })
      });
      if (res.ok) setStatus('Thanks — we\'ll be in touch.'); else setStatus('Something went wrong.');
      await fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'form_submit', slug, meta: { ok: res.ok } }) });
    } catch (e) {
      setStatus('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section style={{ padding: '32px 24px' }} id="form">
      <h2>Get in touch</h2>
      <form onSubmit={onSubmit}>
        {fields.map((f, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <label>
              {f.label}
              <input name={f.name} type={f.type} required={Boolean(f.required)} style={{ display: 'block', padding: 8, width: '100%', maxWidth: 420 }} />
            </label>
          </div>
        ))}
        <button disabled={submitting} type="submit">{submitting ? 'Submitting…' : 'Submit'}</button>
      </form>
      {status && <p>{status}</p>}
    </section>
  );
}


