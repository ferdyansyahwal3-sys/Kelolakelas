import { DaftarUsahaPlatform } from "@/components/platform/DaftarUsahaPlatform";

export default function Usaha({ searchParams }: { searchParams: { status?: string } }) {
  return <DaftarUsahaPlatform statusAwal={searchParams.status} />;
}
