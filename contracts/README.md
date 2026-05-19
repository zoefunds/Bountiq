# Bountiq Contracts

GenLayer Intelligent Contract: `bountiq_registry.py`

## What it does

Holds bounties, accepts submissions, evaluates each submission with a GenLayer LLM against a weighted rubric, ranks submissions, and finalizes winners.

State is stored as JSON strings inside `TreeMap` so the Studio UI and the frontend can decode it without a custom ABI.

## Public methods

| Method | Kind | Caller | Purpose |
| --- | --- | --- | --- |
| `grant_creator(address)` | write | admin | Authorize an address to publish bounties |
| `revoke_creator(address)` | write | admin | Remove a creator |
| `is_creator(address)` | view | anyone | Check creator status |
| `get_admin()` | view | anyone | Returns the admin address |
| `create_bounty(...)` | write | creator | Publish a bounty, returns the new id |
| `close_submissions(id)` | write | creator or admin | Move bounty to judging state |
| `submit_entry(...)` | write | any signer | Add a submission to an open bounty |
| `evaluate_submission(id)` | write | any signer | Run the LLM on a submission |
| `finalize_winners(id)` | write | creator or admin | Rank scored submissions and pick winners |
| `get_bounty(id)` | view | anyone | JSON string of the bounty |
| `get_submission(id)` | view | anyone | JSON string of the submission |
| `list_bounty_submissions(id)` | view | anyone | All submissions for a bounty |

## Rubric

Weights must sum to 100. The weighted score is `(innovation*w1 + technical*w2 + impact*w3 + presentation*w4) / 100`.

## Deployment

See `docs/DEPLOYMENT.md` for the full GenLayer Studio walkthrough.
