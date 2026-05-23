import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { WalletUnlockModal } from "@/components/wallet/WalletUnlockModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />
      <div className="flex-1">
        <AuthGuard>
          {children}
          <WalletUnlockModal />
        </AuthGuard>
      </div>
      <Footer />
    </div>
  );
}
