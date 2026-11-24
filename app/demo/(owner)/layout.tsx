import { TabBar } from "@/components/TabBar";

/** Sama dengan app/app/layout.tsx; awalan alamat menu bawah diganti ke /demo lewat konteks. */
export default function DemoOwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell has-nav">
      {children}
      <TabBar />
    </div>
  );
}
