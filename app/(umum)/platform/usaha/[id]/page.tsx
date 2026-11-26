import { notFound } from "next/navigation";
import { DetailUsahaPlatform } from "@/components/platform/DetailUsahaPlatform";
import { usahaContoh } from "@/lib/platformContoh";

export default function DetailUsaha({ params }: { params: { id: string } }) {
  if (!usahaContoh.some((u) => u.id === params.id)) notFound();
  return <DetailUsahaPlatform id={params.id} />;
}
