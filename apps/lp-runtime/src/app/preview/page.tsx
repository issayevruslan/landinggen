"use client";
import { useMemo } from "react";
import { Renderer } from "../../components/Renderer";

export default function Preview({ searchParams }: any) {
  const spec = useMemo(() => {
    try {
      if (!searchParams?.spec) return null;
      const json = decodeURIComponent(escape(window.atob(searchParams.spec)));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }, [searchParams]);

  if (!spec) return <main style={{ padding: 24 }}>No spec supplied.</main>;

  return (
    <main>
      <Renderer spec={spec} />
    </main>
  );
}


