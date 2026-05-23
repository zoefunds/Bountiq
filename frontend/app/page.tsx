"use client";

import * as React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/config/site";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-grain opacity-70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1.4 }}
      />

      <Navbar />

      <section className="relative z-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="container flex flex-col items-center pt-24 pb-32 text-center"
        >
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-4 py-1.5 text-xs font-medium tracking-wide text-ink/70 backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#b8975a]" />
            Powered by GenLayer Intelligent Contracts
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance md:text-7xl"
          >
            Bounty review that thinks for itself.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-2xl text-lg text-ink/70 text-balance"
          >
            {siteConfig.description}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link
              href="/create"
              className="rounded-full bg-ink px-7 py-3 text-sm font-medium text-canvas transition hover:opacity-90"
            >
              Create a bounty
            </Link>
            <Link
              href="/bounties"
              className="rounded-full border border-ink/15 bg-white/60 px-7 py-3 text-sm font-medium text-ink backdrop-blur transition hover:bg-white"
            >
              Browse open bounties
            </Link>
          </motion.div>

          <motion.div
            variants={stagger}
            className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3"
          >
            <FeatureCard
              kicker="01"
              title="Authorized creators"
              body="Only verified accounts can publish bounties. Reward, winner count, and split percentages are set at creation."
            />
            <FeatureCard
              kicker="02"
              title="Intelligent evaluation"
              body="GenLayer LLMs score every submission against weighted criteria and produce transparent reasoning on chain."
            />
            <FeatureCard
              kicker="03"
              title="Verifiable winners"
              body="Ranking and winner selection happen inside an Intelligent Contract. Payouts are tracked, never custodied."
            />
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}

function FeatureCard({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="surface rounded-2xl p-6 text-left"
    >
      <div className="font-mono text-xs uppercase tracking-widest text-ink/40">
        {kicker}
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/65">{body}</p>
    </motion.div>
  );
}
