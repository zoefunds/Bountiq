export const siteConfig = {
  name: "Bountiq",
  tagline: "Intelligent bounty review, powered by GenLayer.",
  description:
    "Bountiq is a bounty review and payout platform where GenLayer Intelligent Contracts evaluate every submission against a transparent, weighted rubric. Authorized creators post tasks, the community submits work, and winners are selected on chain.",
  url: "https://bountiq.app",
  ogImage: "/og.png",
  primaryHex: "#efece4",
  links: {
    docs: "https://docs.genlayer.com",
    github: "https://github.com/zoefunds/Bountiq",
  },
} as const;

export type SiteConfig = typeof siteConfig;
