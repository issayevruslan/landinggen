import React from "react";
import { Hero } from "./sections/Hero";
import { Features } from "./sections/Features";
import { Benefits } from "./sections/Benefits";
import { Testimonials } from "./sections/Testimonials";
import { CTA } from "./sections/CTA";
import { FormSection } from "./sections/Form";

export function Renderer({ spec }: { spec: any }) {
  const sections: any[] = spec?.sections || [];
  return (
    <>
      {sections.map((s, i) => {
        switch (s.type) {
          case "hero":
            return <Hero key={i} {...(s.data || {})} slug={spec?.meta?.slug} />;
          case "features":
            return <Features key={i} {...(s.data || {})} />;
          case "benefits":
            return <Benefits key={i} {...(s.data || {})} />;
          case "testimonials":
            return <Testimonials key={i} {...(s.data || {})} />;
          case "cta":
            return <CTA key={i} {...(s.data || {})} />;
          case "form":
            return <FormSection key={i} {...(s.data || {})} slug={spec?.meta?.slug} />;
          default:
            return (
              <section key={i} style={{ padding: 24, border: '1px dashed #ddd' }}>
                <h3>{s.type}</h3>
                <pre>{JSON.stringify(s.data || {}, null, 2)}</pre>
              </section>
            );
        }
      })}
    </>
  );
}


