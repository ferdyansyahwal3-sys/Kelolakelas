import { CekStatus } from "@/components/CekStatus";
import { PageHeader } from "@/components/PageHeader";

export default function Status({ params }: { params: { slug: string } }) {
  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 20 }}>
        <PageHeader title="Cek status" back={`/u/${params.slug}/slot`} chip="Pendaftaran kamu" />
        <CekStatus slug={params.slug} />
      </main>
    </div>
  );
}
