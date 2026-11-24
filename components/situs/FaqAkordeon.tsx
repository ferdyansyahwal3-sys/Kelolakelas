"use client";
import { useState } from "react";
import type { Tanya } from "@/lib/situs";

export function FaqAkordeon({ daftar }: { daftar: Tanya[] }) {
  const [buka, setBuka] = useState<number | null>(null);
  return (
    <div className="s-faq" data-reveal>
      {daftar.map((x, i) => {
        const on = buka === i;
        return (
          <div key={x.t} className={`surface s-faq-item${on ? " on" : ""}`}>
            <button type="button" className="s-faq-q" aria-expanded={on} aria-controls={`faq-${i}`} onClick={() => setBuka(on ? null : i)}>
              <span>{x.t}</span><span className="s-faq-plus" aria-hidden="true" />
            </button>
            <div id={`faq-${i}`} className="s-faq-a" role="region"><div><p>{x.j}</p></div></div>
          </div>
        );
      })}
    </div>
  );
}
