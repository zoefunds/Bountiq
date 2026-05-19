# Deploying the Bountiq Registry to GenLayer Studio / StudioNet

The contract lives at `contracts/bountiq_registry.py`. GenLayer contracts are deployed through the GenLayer Studio web IDE.

## 1. Open the Studio

Go to https://studio.genlayer.com.

If this is your first visit, the Studio will create a local key for you. Save the seed phrase that pops up; you will need it to retain admin rights on the deployed contract.

Top-right network selector:
- `Localnet` runs validators in your browser. Best for fast iteration.
- `Studionet` is the shared public testnet. Use this for your demo.

Choose `Studionet`.

## 2. Create the contract file

In the file tree on the left, click the plus icon and create `bountiq_registry.py`.

Open the file at `contracts/bountiq_registry.py` in this repository and copy its contents into the Studio editor. Save with `Cmd+S`.

## 3. Deploy

Click the `Deploy` button. Studio will show a constructor form. The constructor takes no arguments, so just confirm.

Wait for the green confirmation. You will see a contract address that looks like `0x1234...`. Copy it.

## 4. Paste the address into the frontend env

Open `frontend/.env.local` and set:
NEXT_PUBLIC_BOUNTIQ_CONTRACT_ADDRESS=0xYourContractAddressHere

Restart `npm run dev` so Next picks up the new value.
## 5. Smoke test the contract from Studio
In the Studio `Run` panel, call `get_admin()`. It should return the address of the account that deployed the contract (you).
Call `grant_creator` with your own address. Then call `is_creator` to confirm it returns `true`.
Call `create_bounty` with sample arguments. Verify `get_bounty_count` returns `1`.
Call `submit_entry` against bounty id `1`. Then call `evaluate_submission` for the new submission id. The LLM round-trip takes 20 to 60 seconds. When it returns, call `get_submission` and confirm the `score` field is populated with `innovation`, `technical`, `impact`, `presentation`, `weighted`, and `reasoning`.
Call `finalize_winners(1)`. Verify the bounty now has `status: "completed"` and a `winners` list.
If every step above returns the expected result, the contract is ready. We will wire the frontend to it in Step 6.
