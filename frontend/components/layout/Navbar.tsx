"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

export function Navbar() {
  const { firebaseUser, appUser, signOutUser, loading, hasRole } = useAuth();

  return (
    <header className="relative z-20 border-b border-ink/5 bg-canvas/80 backdrop-blur">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/boun.svg" alt={siteConfig.name} className="h-7 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-ink/70 md:flex">
          <Link href="/bounties" className="transition hover:text-ink">Bounties</Link>
          <Link href="/submissions" className="transition hover:text-ink">Submissions</Link>
          <Link href="/judge" className="transition hover:text-ink">Judging</Link>
          <Link href="/profile" className="transition hover:text-ink">Profile</Link>
          {hasRole("admin") ? (
            <Link href="/admin" className="transition hover:text-ink">Admin</Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-r-transparent" />
          ) : firebaseUser ? (
            <>
              <span className="hidden text-sm text-ink/70 sm:inline">
                {appUser?.displayName || firebaseUser.email}
              </span>
              <Button variant="secondary" size="sm" onClick={() => signOutUser()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/signin">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
