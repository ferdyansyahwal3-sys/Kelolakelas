import { TabBar } from "@/components/TabBar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      {children}
      <TabBar />
    </div>
  );
}
