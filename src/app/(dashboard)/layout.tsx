import { AppHeader } from "@/shared/ui/components/app-header";
import { ConnectivityBanner } from "@/shared/ui/components/connectivity-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <ConnectivityBanner />
      <main className="max-w-[1020px] mx-auto px-4 py-4 space-y-4">
        {children}
      </main>
    </>
  );
}
