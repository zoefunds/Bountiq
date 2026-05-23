import { Navbar } from "@/components/layout/Navbar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { WalletUnlockModal } from "@/components/wallet/WalletUnlockModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <AuthGuard>
        {children}
        <WalletUnlockModal />
      </AuthGuard>
    </div>
  );
}
