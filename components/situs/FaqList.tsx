import type { Tanya } from "@/lib/situs";

export function FaqList({ daftar }: { daftar: Tanya[] }) {
  return (
    <div className="s-faq">
      {daftar.map((x) => (
        <details key={x.t} className="surface s-faq-item">
          <summary>{x.t}</summary>
          <p>{x.j}</p>
        </details>
      ))}
    </div>
  );
}
