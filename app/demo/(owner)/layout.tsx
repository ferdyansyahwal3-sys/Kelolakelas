import { TabBar } from "@/components/TabBar";
import { SidebarOwner } from "@/components/SidebarOwner";
import { ringkasanContoh } from "@/lib/contoh";

/** Sama dengan app/app/layout.tsx; awalan alamat menu bawah diganti ke /demo lewat konteks. */
export default function DemoOwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell has-nav owner">
      <SidebarOwner pendaftaran={ringkasanContoh.pendaftaranMenunggu.length} />
      {children}
      <TabBar />
    </div>
  );
}
