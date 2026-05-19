"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRoles,
  redirectTo = "/signin",
}: AuthGuardProps) {
  const { firebaseUser, appUser, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace(redirectTo);
      return;
    }
    if (requiredRoles && appUser) {
      const allowed = requiredRoles.some((r) => appUser.roles.includes(r));
      if (!allowed) router.replace("/bounties");
    }
  }, [loading, firebaseUser, appUser, requiredRoles, redirectTo, router]);

  if (loading || !firebaseUser) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 text-sm text-ink/50">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-r-transparent" />
          Verifying session
        </div>
      </div>
    );
  }

  if (requiredRoles && appUser) {
    const allowed = requiredRoles.some((r) => appUser.roles.includes(r));
    if (!allowed) return null;
  }

  return <>{children}</>;
}
