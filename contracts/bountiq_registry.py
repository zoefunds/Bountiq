# Bountiq Registry
# GenLayer Intelligent Contract for bounty creation, submission, AI evaluation, and winner selection.
# Deploys to GenLayer Studio / StudioNet.

from genlayer import *
import json
import typing


# ---------- Data classes ----------

class Rubric(typing.TypedDict):
    innovation: int      # weight 0-100
    technical: int
    impact: int
    presentation: int


class PayoutSplit(typing.TypedDict):
    rank: int
    percentage: int


class Bounty(typing.TypedDict):
    id: int
    creator: str
    title: str
    description: str
    reward_amount: int
    reward_token: str
    winner_count: int
    payout_splits: list[PayoutSplit]
    rubric: Rubric
    status: str          # "open" | "judging" | "completed" | "cancelled"
    deadline: int
    submission_ids: list[int]
    winners: list[int]


class Score(typing.TypedDict):
    innovation: int
    technical: int
    impact: int
    presentation: int
    weighted: int
    reasoning: str


class Submission(typing.TypedDict):
    id: int
    bounty_id: int
    submitter: str
    title: str
    summary: str
    content_url: str
    status: str          # "submitted" | "scored" | "winner" | "rejected"
    score: Score | None
    rank: int


# ---------- Contract ----------

class BountiqRegistry(gl.Contract):
    admin: str
    creators: TreeMap[str, bool]
    bounty_count: u256
    submission_count: u256
    bounties: TreeMap[u256, str]               # store as JSON for portability
    submissions: TreeMap[u256, str]

    def __init__(self) -> None:
        self.admin = str(gl.message.sender_address)
        self.bounty_count = u256(0)
        self.submission_count = u256(0)
        self.creators[self.admin] = True

    # ---------- Internal helpers ----------

    def _require_admin(self) -> None:
        if str(gl.message.sender_address) != self.admin:
            raise Exception("only admin")

    def _require_creator(self) -> None:
        sender = str(gl.message.sender_address)
        if not self.creators.get(sender, False):
            raise Exception("not an authorized creator")

    def _load_bounty(self, bounty_id: int) -> Bounty:
        raw = self.bounties.get(u256(bounty_id))
        if raw is None:
            raise Exception("bounty not found")
        return json.loads(raw)

    def _save_bounty(self, bounty: Bounty) -> None:
        self.bounties[u256(bounty["id"])] = json.dumps(bounty)

    def _load_submission(self, submission_id: int) -> Submission:
        raw = self.submissions.get(u256(submission_id))
        if raw is None:
            raise Exception("submission not found")
        return json.loads(raw)

    def _save_submission(self, submission: Submission) -> None:
        self.submissions[u256(submission["id"])] = json.dumps(submission)

    # ---------- Admin: role management ----------

    @gl.public.write
    def grant_creator(self, address: str) -> None:
        self._require_admin()
        self.creators[address] = True

    @gl.public.write
    def revoke_creator(self, address: str) -> None:
        self._require_admin()
        self.creators[address] = False

    @gl.public.view
    def is_creator(self, address: str) -> bool:
        return self.creators.get(address, False)

    @gl.public.view
    def get_admin(self) -> str:
        return self.admin

    # ---------- Bounty lifecycle ----------

    @gl.public.write
    def create_bounty(
        self,
        title: str,
        description: str,
        reward_amount: int,
        reward_token: str,
        winner_count: int,
        payout_splits: list[PayoutSplit],
        rubric: Rubric,
        deadline: int,
    ) -> int:
        self._require_creator()

        if winner_count < 1:
            raise Exception("winner_count must be >= 1")
        if len(payout_splits) != winner_count:
            raise Exception("payout_splits length must match winner_count")
        total_split = sum(s["percentage"] for s in payout_splits)
        if total_split != 100:
            raise Exception("payout_splits must sum to 100")
        total_weight = rubric["innovation"] + rubric["technical"] + rubric["impact"] + rubric["presentation"]
        if total_weight != 100:
            raise Exception("rubric weights must sum to 100")

        new_id = int(self.bounty_count) + 1
        self.bounty_count = u256(new_id)

        bounty: Bounty = {
            "id": new_id,
            "creator": str(gl.message.sender_address),
            "title": title,
            "description": description,
            "reward_amount": reward_amount,
            "reward_token": reward_token,
            "winner_count": winner_count,
            "payout_splits": payout_splits,
            "rubric": rubric,
            "status": "open",
            "deadline": deadline,
            "submission_ids": [],
            "winners": [],
        }
        self._save_bounty(bounty)
        return new_id

    @gl.public.write
    def close_submissions(self, bounty_id: int) -> None:
        bounty = self._load_bounty(bounty_id)
        sender = str(gl.message.sender_address)
        if sender != bounty["creator"] and sender != self.admin:
            raise Exception("only bounty creator or admin")
        if bounty["status"] != "open":
            raise Exception("bounty not open")
        bounty["status"] = "judging"
        self._save_bounty(bounty)

    # ---------- Submission flow ----------

    @gl.public.write
    def submit_entry(
        self,
        bounty_id: int,
        title: str,
        summary: str,
        content_url: str,
    ) -> int:
        bounty = self._load_bounty(bounty_id)
        if bounty["status"] != "open":
            raise Exception("bounty is not accepting submissions")

        new_id = int(self.submission_count) + 1
        self.submission_count = u256(new_id)

        submission: Submission = {
            "id": new_id,
            "bounty_id": bounty_id,
            "submitter": str(gl.message.sender_address),
            "title": title,
            "summary": summary,
            "content_url": content_url,
            "status": "submitted",
            "score": None,
            "rank": 0,
        }
        self._save_submission(submission)

        bounty["submission_ids"].append(new_id)
        self._save_bounty(bounty)
        return new_id

    # ---------- AI evaluation via GenLayer LLM ----------

    @gl.public.write
    def evaluate_submission(self, submission_id: int) -> None:
        submission = self._load_submission(submission_id)
        if submission["status"] not in ("submitted", "scored"):
            raise Exception("submission cannot be re-evaluated in this state")

        bounty = self._load_bounty(submission["bounty_id"])
        rubric = bounty["rubric"]

        prompt = f"""You are an impartial bounty judge for the Bountiq platform.

Bounty title: {bounty['title']}
Bounty description: {bounty['description']}

Submission title: {submission['title']}
Submission summary: {submission['summary']}
Submission content reference: {submission['content_url']}

Evaluate this submission against four criteria. For each criterion, return an integer score from 0 to 100.

Criteria and weights:
- innovation (weight {rubric['innovation']}%): originality, novelty, creative reframing
- technical (weight {rubric['technical']}%): execution quality, correctness, depth
- impact (weight {rubric['impact']}%): potential reach, usefulness, importance
- presentation (weight {rubric['presentation']}%): clarity, polish, completeness of the demo

Respond with ONLY a JSON object in this exact shape, no prose, no markdown:
{{
  "innovation": <int 0-100>,
  "technical": <int 0-100>,
  "impact": <int 0-100>,
  "presentation": <int 0-100>,
  "reasoning": "<one or two sentence justification>"
}}
"""

        def evaluate() -> str:
            return gl.nondet.exec_prompt(prompt)

        raw = gl.eq_principle_strict_eq(evaluate)

        try:
            parsed = json.loads(raw.strip().strip("`").strip())
        except Exception:
            raise Exception("LLM returned invalid JSON")

        innovation = int(parsed.get("innovation", 0))
        technical = int(parsed.get("technical", 0))
        impact = int(parsed.get("impact", 0))
        presentation = int(parsed.get("presentation", 0))
        reasoning = str(parsed.get("reasoning", ""))[:1000]

        weighted = (
            innovation * rubric["innovation"]
            + technical * rubric["technical"]
            + impact * rubric["impact"]
            + presentation * rubric["presentation"]
        ) // 100

        submission["score"] = {
            "innovation": max(0, min(100, innovation)),
            "technical": max(0, min(100, technical)),
            "impact": max(0, min(100, impact)),
            "presentation": max(0, min(100, presentation)),
            "weighted": max(0, min(100, weighted)),
            "reasoning": reasoning,
        }
        submission["status"] = "scored"
        self._save_submission(submission)

    # ---------- Finalize winners ----------

    @gl.public.write
    def finalize_winners(self, bounty_id: int) -> list[int]:
        bounty = self._load_bounty(bounty_id)
        sender = str(gl.message.sender_address)
        if sender != bounty["creator"] and sender != self.admin:
            raise Exception("only bounty creator or admin")
        if bounty["status"] not in ("open", "judging"):
            raise Exception("bounty already finalized")

        scored: list[Submission] = []
        for sid in bounty["submission_ids"]:
            sub = self._load_submission(sid)
            if sub["score"] is not None:
                scored.append(sub)

        scored.sort(key=lambda s: s["score"]["weighted"], reverse=True)

        winners: list[int] = []
        for i, sub in enumerate(scored[: bounty["winner_count"]]):
            sub["rank"] = i + 1
            sub["status"] = "winner"
            self._save_submission(sub)
            winners.append(sub["id"])

        for sub in scored[bounty["winner_count"] :]:
            sub["status"] = "rejected"
            self._save_submission(sub)

        bounty["winners"] = winners
        bounty["status"] = "completed"
        self._save_bounty(bounty)
        return winners

    # ---------- View methods ----------

    @gl.public.view
    def get_bounty(self, bounty_id: int) -> str:
        return self.bounties.get(u256(bounty_id), "")

    @gl.public.view
    def get_submission(self, submission_id: int) -> str:
        return self.submissions.get(u256(submission_id), "")

    @gl.public.view
    def get_bounty_count(self) -> int:
        return int(self.bounty_count)

    @gl.public.view
    def get_submission_count(self) -> int:
        return int(self.submission_count)

    @gl.public.view
    def list_bounty_submissions(self, bounty_id: int) -> list[str]:
        bounty = self._load_bounty(bounty_id)
        out: list[str] = []
        for sid in bounty["submission_ids"]:
            raw = self.submissions.get(u256(sid))
            if raw is not None:
                out.append(raw)
        return out
