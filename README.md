# Bountiq

Bounty Review and Payout Platform powered by GenLayer Intelligent Contracts and GenLayer LLMs.

Authorized creators post bounties, the community submits entries, and GenLayer LLMs evaluate every submission against a weighted rubric. Winner selection is decided on-chain by Intelligent Contracts; payouts are tracked manually.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `frontend/` | Next.js 15 application (App Router, TypeScript, Tailwind, shadcn/ui) |
| `contracts/` | GenLayer Intelligent Contracts (Python) |
| `firebase/` | Firestore rules, indexes, storage rules |
| `scripts/` | Operational scripts (seeding, deploy walkthroughs) |
| `docs/` | Architecture, contract design, deployment, demo notes |

## Status

Work in progress. See `docs/ARCHITECTURE.md` for the full design.

## License

MIT. See `LICENSE`.
