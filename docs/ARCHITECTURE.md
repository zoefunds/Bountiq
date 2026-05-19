# Bountiq Architecture

## Layers

1. **Frontend** (`frontend/`) — Next.js 15 App Router, TypeScript, Tailwind, shadcn-style UI.
2. **Off-chain backend** (`firebase/`) — Firebase Auth, Firestore, Storage. Stores user profiles, drafts, file uploads, audit log mirror.
3. **On-chain contract** (`contracts/`) — GenLayer Intelligent Contract. Source of truth for bounty terms, scores, and winner selection.
4. **AI evaluation** — GenLayer LLM, invoked from inside the contract via `gl.nondet.exec_prompt` and reconciled with `gl.eq_principle_strict_eq`.

## Data flow

Create bounty
  Frontend calls contract.create_bounty
  Contract returns new bounty id
  Frontend mirrors bounty metadata into Firestore for fast listing

Submit entry
  User uploads file to Firebase Storage
  Frontend calls contract.submit_entry with the storage URL
  Contract returns submission id
  Frontend mirrors submission metadata into Firestore

Evaluate submission
  Anyone (creator, judge, automation) calls contract.evaluate_submission
  Validators ask the LLM the same prompt, agree on the score
  Score and reasoning are now on-chain
  Frontend reads it back via get_submission

Finalize winners
  Bounty creator calls contract.finalize_winners
  Contract sorts scored submissions by weighted score
  Top N are marked winners with their rank
  Bounty status becomes completed

Payout
  Manual. Creator pays winners directly off-platform.
  Frontend records payout confirmation in Firestore audit log.

## Authorization model

| Role | Granted by | Can do |
| --- | --- | --- |
| admin | contract constructor (deployer) | grant or revoke creator role, finalize any bounty |
| creator | admin via grant_creator | create bounties, close submissions, finalize own bounty |
| submitter | any signed-in user | submit entries to open bounties |
| judge | platform admin via Firestore role | view judging dashboard (off-chain mirror) |

On-chain authorization lives in the contract. Off-chain authorization is enforced by Firestore rules.

## Why split state between Firestore and the contract

Firestore is fast and free for the kind of UI queries the app needs every second (listing, search, filtering, leaderboards). The contract is slow and expensive for those queries but irreplaceable as the trust anchor for terms, scores, and winners. We use each for what it is good at.
