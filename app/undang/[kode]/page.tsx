import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { klienServer } from "@/lib/supabase/server";
import { TerimaUndangan } from "./TerimaUndangan";

export const metadata: Metadata = { title: "Undangan pelatih", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Undang({ params }: { params: { kode: string } }) {
  const kode = params.kode;
  if (!/^[A-Za-z0-9]{6,32}$/.test(kode)) redirect("/masuk");
  const { data } = await klienServer().auth.getUser();
  if (!data.user) redirect(`/masuk?lanjut=${encodeURIComponent(`/undang/${kode}`)}`);
  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 28 }}>
        <TerimaUndangan kode={kode} email={data.user.email ?? ""} />
      </main>
    </div>
  );
}
