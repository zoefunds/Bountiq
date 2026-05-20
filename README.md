# Bountiq

Bounty review and payout platform powered by **GenLayer Intelligent Contracts** and **GenLayer LLMs**.

Authorized creators post tasks, the community submits work, and GenLayer LLMs evaluate every submission against a transparent, weighted rubric. Winner selection happens on chain. Payouts are tracked manually so creators stay in control of funds.

## Why this exists

Most bounty platforms either rely on a single human judge (slow, biased, opaque) or use a smart contract that can only compare numbers (useless for creative work). Bountiq does the third thing: an Intelligent Contract running on GenLayer Studionet that asks an LLM to evaluate every submission, reaches validator consensus on the result, and ranks the winners. The reasoning behind each score is recorded on chain.

## Features

| Capability | Status |
| --- | --- |
| Email + Google sign-in with auto-provisioned wallets | Yes |
| Role-based access: admin, creator, judge, submitter | Yes |
| On-chain bounty registry with weighted rubric and payout splits | Yes |
| Sealed-until-reveal submissions | Yes |
| AI evaluation per submission via GenLayer LLM consensus | Yes |
| Bulk "Evaluate all" for creators and judges | Yes |
| On-chain `finalize_winners` with Firestore mirror | Yes |
| Manual payout tracker with copy-to-clipboard wallet display | Yes |
| Admin dashboard with role toggles and on-chain creator grants | Yes |
| Audit log of all platform-level actions | Yes |
| User profile with GEN balance and private key export | Yes |
| Pre-transaction balance check that blocks 0-balance wallets | Yes |

## Architecture
┌──────────────────────────────────────────────────────────────┐
│ User browser │
└──────────────────────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────┐
│ Frontend: Next.js 16 App Router, TypeScript, Tailwind v3, │
│ shadcn-style primitives, Framer Motion │
└──────────────────────────────────────────────────────────────┘
│ │
▼ ▼
┌────────────────────────┐ ┌────────────────────────────────┐
│ Firebase │ │ GenLayer Studionet │
│ Auth │ │ BountiqRegistry contract │
│ Firestore │ │ create_bounty, submit_entry, │
│ Storage │ │ evaluate_submission, │
│ Security rules │ │ finalize_winners │
└────────────────────────┘ └────────────────────────────────┘

Firestore stores everything we need to render the UI quickly (lists, search, leaderboards, payout tracking). The contract owns anything that must be verifiable: bounty terms, scores, the LLM's reasoning, and winner selection. Payment intent is recorded; tokens are never custodied by the platform.
## Repository layout
| Path | Purpose |
| --- | --- |
| `frontend/` | Next.js application |
| `contracts/` | GenLayer Intelligent Contract source |
| `firebase/` | Firestore rules, indexes, storage rules, project config |
| `scripts/` | Operational scripts |
| `docs/` | Architecture, deployment, design notes |
## Local development
Requirements: Node 20 or 22, Python 3.11+, a Firebase project, a GenLayer Studio account on Studionet.
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in your Firebase web SDK keys and the deployed contract address
npm run dev
The dev server starts at http://localhost:3000.

Deploying the contract
The contract lives at contracts/bountiq_registry.py. See docs/DEPLOYMENT.md for the GenLayer Studio walkthrough. In short:

Open studio.genlayer.com, switch to Studionet
Paste contracts/bountiq_registry.py into the editor and deploy
Copy the deployed address into frontend/.env.local as NEXT_PUBLIC_BOUNTIQ_CONTRACT_ADDRESS
From the deployer account, call grant_creator for any address that should be allowed to publish bounties
Deploying the frontend to Vercel
cd frontend
vercel link --project bountiq
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# repeat for the other public env vars
vercel deploy --prod
License
MIT
