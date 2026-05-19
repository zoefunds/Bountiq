"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";

export default function SignInPage() {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail, firebaseUser } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (firebaseUser) router.replace("/bounties");
  }, [firebaseUser, router]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.replace("/bounties");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.replace("/bounties");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="container grid place-items-center py-20">
        <div className="surface w-full max-w-md rounded-3xl p-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Sign in to continue to Bountiq.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-8 w-full"
            onClick={handleGoogle}
            loading={submitting}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink/40">
            <span className="h-px flex-1 bg-ink/10" />
            or
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
            {error ? (
              <p className="text-xs text-red-500">{error}</p>
            ) : null}
            <Button type="submit" className="w-full" loading={submitting}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink/60">
            New here?{" "}
            <Link href="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
