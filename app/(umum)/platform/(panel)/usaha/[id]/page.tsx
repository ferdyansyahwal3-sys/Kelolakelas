import { DetailUsahaPlatform } from "@/components/platform/DetailUsahaPlatform";

/** Usaha yang tidak ada ditangani komponen (ia membaca daftar dari database lewat provider). */
export default function DetailUsaha({ params }: { params: { id: string } }) {
  return <DetailUsahaPlatform id={params.id} />;
}
