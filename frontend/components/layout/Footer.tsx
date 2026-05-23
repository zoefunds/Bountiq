"use client";

import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-ink/10 bg-canvas">
      <div className="container py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center">
              <img src="/boun.svg" alt={siteConfig.name} className="h-7 w-auto object-contain" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60">
              Bounty review and payout, decided on chain by GenLayer Intelligent Contracts and evaluated by GenLayer LLMs.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-3 py-1 text-xs font-medium text-ink/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4f7a5a]" />
              StudioNet ready
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink/45">
              Platform
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-ink/65">
              <li><Link href="/bounties" className="transition hover:text-ink">Bounties</Link></li>
              <li><Link href="/create" className="transition hover:text-ink">Create a bounty</Link></li>
              <li><Link href="/judge" className="transition hover:text-ink">Judging</Link></li>
              <li><Link href="/submissions" className="transition hover:text-ink">My submissions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink/45">
              Account
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-ink/65">
              <li><Link href="/profile" className="transition hover:text-ink">Profile</Link></li>
              <li><Link href="/signin" className="transition hover:text-ink">Sign in</Link></li>
              <li><Link href="/signup" className="transition hover:text-ink">Create account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink/45">
              Resources
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-ink/65">
              <li>
                <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-ink">
                  GenLayer docs
                </a>
              </li>
              <li>
                <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-ink">
                  GenLayer Studio
                </a>
              </li>
              <li>
                <a href={siteConfig.links.github} target="_blank" rel="noopener noreferrer" className="transition hover:text-ink">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-ink/10 pt-6 text-xs text-ink/50 sm:flex-row sm:items-center">
          <span>© {year} {siteConfig.name}. All rights reserved.</span>
          <span className="font-mono uppercase tracking-widest">Powered by GenLayer</span>
        </div>
      </div>
    </footer>
  );
}
