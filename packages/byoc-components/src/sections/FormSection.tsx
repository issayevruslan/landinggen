"use client";
import React, { useState } from "react";

type Field = { name: string; label: string; type: string; required?: boolean };

export function FormSection({ fields = [] as Field[], onSubmitTo }: { fields?: Field[]; onSubmitTo?: (data: Record<string, string>) => Promise<boolean> | boolean }) {
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onSubmitTo) return;
    const data = Object.fromEntries(new FormData(e.currentTarget) as any) as Record<string, string>;
    setSubmitting(true);
    setStatus("");
    try {
      const ok = await onSubmitTo(data);
      setStatus(ok ? 'Thanks — we\'ll be in touch.' : 'Something went wrong.');
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


