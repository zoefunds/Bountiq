# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
from dataclasses import dataclass


@allow_storage
@dataclass
class Rubric:
    innovation: u64
    technical: u64
    impact: u64
    presentation: u64


@allow_storage
@dataclass
class PayoutSplit:
    rank: u64
    percentage: u64


@allow_storage
@dataclass
class Bounty:
    id: u64
    creator: str
    title: str
    description: str
    reward_amount: u256
    reward_token: str
    winner_count: u64
    payout_splits: DynArray[PayoutSplit]
    rubric: Rubric
    status: str
    deadline: u64
    submission_ids: DynArray[u256]
    winners: DynArray[u256]


@allow_storage
@dataclass
class Score:
    innovation: u64
    technical: u64
    impact: u64
    presentation: u64
    weighted: u64
    reasoning: str


@allow_storage
@dataclass
class Submission:
    id: u64
    bounty_id: u64
    submitter: str
    title: str
    summary: str
    content_url: str
    status: str
    score: Score
    has_score: bool
    rank: u64


class BountiqRegistry(gl.Contract):
    admin: str
    creators: TreeMap[str, bool]
    bounty_count: u256
    submission_count: u256
    bounties: TreeMap[u256, Bounty]
    submissions: TreeMap[u256, Submission]

    def __init__(self) -> None:
        self.admin = str(gl.message.sender_address)
        self.bounty_count = u256(0)
        self.submission_count = u256(0)
        self.creators[self.admin] = True

    def _require_admin(self) -> None:
        if str(gl.message.sender_address) != self.admin:
            raise gl.vm.UserError("only admin")

    def _require_creator(self) -> None:
        sender = str(gl.message.sender_address)
        if not self.creators.get(sender, False):
            raise gl.vm.UserError("not an authorized creator")

    def _load_bounty(self, bounty_id: u64) -> Bounty:
        return self.bounties.get(u256(bounty_id))

    def _save_bounty(self, bounty: Bounty) -> None:
        self.bounties[u256(bounty.id)] = bounty

    def _load_submission(self, submission_id: u64) -> Submission:
        return self.submissions.get(u256(submission_id))

    def _save_submission(self, submission: Submission) -> None:
        self.submissions[u256(submission.id)] = submission

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

    @gl.public.write
    def create_bounty(
        self,
        title: str,
        description: str,
        reward_amount: int,
        reward_token: str,
        winner_count: int,
        payout_splits: DynArray[PayoutSplit],
        rubric: Rubric,
        deadline: int,
    ) -> u64:
        self._require_creator()
        if winner_count < 1:
            raise gl.vm.UserError("winner_count must be >= 1")
        if len(payout_splits) != winner_count:
            raise gl.vm.UserError("payout_splits length must match winner_count")
        total_split = sum(s.percentage for s in payout_splits)
        if total_split != 100:
            raise gl.vm.UserError("payout_splits must sum to 100")
        total_weight = rubric.innovation + rubric.technical + rubric.impact + rubric.presentation
        if total_weight != 100:
            raise gl.vm.UserError("rubric weights must sum to 100")

        new_id = u64(int(self.bounty_count) + 1)
        self.bounty_count = u256(new_id)

        bounty = Bounty(
            id=new_id,
            creator=str(gl.message.sender_address),
            title=title,
            description=description,
            reward_amount=u256(reward_amount),
            reward_token=reward_token,
            winner_count=u64(winner_count),
            payout_splits=payout_splits,
            rubric=rubric,
            status="open",
            deadline=u64(deadline),
            submission_ids=DynArray[u256](),
            winners=DynArray[u256](),
        )
        self._save_bounty(bounty)
        return new_id

    @gl.public.write
    def close_submissions(self, bounty_id: int) -> None:
        bounty = self._load_bounty(u64(bounty_id))
        if bounty is None:
            raise gl.vm.UserError("bounty not found")
        sender = str(gl.message.sender_address)
        if sender != bounty.creator and sender != self.admin:
            raise gl.vm.UserError("only bounty creator or admin")
        if bounty.status != "open":
            raise gl.vm.UserError("bounty not open")
        bounty.status = "judging"
        self._save_bounty(bounty)

    @gl.public.write
    def submit_entry(
        self,
        bounty_id: int,
        title: str,
        summary: str,
        content_url: str,
    ) -> u64:
        bounty = self._load_bounty(u64(bounty_id))
        if bounty is None:
            raise gl.vm.UserError("bounty not found")
        if bounty.status != "open":
            raise gl.vm.UserError("bounty is not accepting submissions")

        new_id = u64(int(self.submission_count) + 1)
        self.submission_count = u256(new_id)

        submission = Submission(
            id=new_id,
            bounty_id=u64(bounty_id),
            submitter=str(gl.message.sender_address),
            title=title,
            summary=summary,
            content_url=content_url,
            status="submitted",
            score=Score(innovation=0, technical=0, impact=0, presentation=0, weighted=0, reasoning=""),
            has_score=False,
            rank=0,
        )
        self._save_submission(submission)
        bounty.submission_ids.append(u256(new_id))
        self._save_bounty(bounty)
        return new_id

    @gl.public.write
    def evaluate_submission(self, submission_id: int) -> None:
        submission = self._load_submission(u64(submission_id))
        if submission is None:
            raise gl.vm.UserError("submission not found")
        if submission.status not in ("submitted", "scored"):
            raise gl.vm.UserError("submission cannot be re-evaluated in this state")

        bounty = self._load_bounty(submission.bounty_id)
        if bounty is None:
            raise gl.vm.UserError("bounty not found")
        rubric = bounty.rubric

        prompt = (
            f"""You are an impartial bounty judge for the Bountiq platform.\n"""
            f"""Bounty title: {bounty.title}\n"""
            f"""Bounty description: {bounty.description}\n\n"""
            f"""Submission title: {submission.title}\n"""
            f"""Submission summary: {submission.summary}\n"""
            f"""Submission content reference: {submission.content_url}\n\n"""
            f"""Evaluate this submission against four criteria. For each criterion, return an integer score from 0 to 100.\n\n"""
            f"""Criteria and weights:\n"""
            f"""- innovation (weight {rubric.innovation}%): originality, novelty, creative reframing\n"""
            f"""- technical (weight {rubric.technical}%): execution quality, correctness, depth\n"""
            f"""- impact (weight {rubric.impact}%): potential reach, usefulness, importance\n"""
            f"""- presentation (weight {rubric.presentation}%): clarity, polish, completeness of the demo\n\n"""
            f"""Respond with ONLY a JSON object in this exact shape, no prose, no markdown:\n"""
            f"""{{\n"""
            f"""  \"innovation\": <int 0-100>,\n"""
            f"""  \"technical\": <int 0-100>,\n"""
            f"""  \"impact\": <int 0-100>,\n"""
            f"""  \"presentation\": <int 0-100>,\n"""
            f"""  \"reasoning\": \"<one or two sentence justification>\"\n"""
            f"""}}\n"""
        )

        def evaluate() -> str:
            return gl.nondet.exec_prompt(prompt, response_format="json")

        raw = gl.eq_principle_strict_eq(evaluate)

        try:
            parsed = json.loads(raw.strip().strip("`").strip())
        except Exception:
            raise gl.vm.UserError("LLM returned invalid JSON")

        innovation = u64(parsed.get("innovation", 0))
        technical = u64(parsed.get("technical", 0))
        impact = u64(parsed.get("impact", 0))
        presentation = u64(parsed.get("presentation", 0))
        reasoning = str(parsed.get("reasoning", ""))[:1000]

        weighted = (
            innovation * rubric.innovation
            + technical * rubric.technical
            + impact * rubric.impact
            + presentation * rubric.presentation
        ) // 100

        submission.score = Score(
            innovation=max(0, min(100, innovation)),
            technical=max(0, min(100, technical)),
            impact=max(0, min(100, impact)),
            presentation=max(0, min(100, presentation)),
            weighted=max(0, min(100, weighted)),
            reasoning=reasoning,
        )
        submission.status = "scored"
        submission.has_score = True
        self._save_submission(submission)

    @gl.public.write
    def finalize_winners(self, bounty_id: int) -> list[u64]:
        bounty = self._load_bounty(u64(bounty_id))
        if bounty is None:
            raise gl.vm.UserError("bounty not found")
        sender = str(gl.message.sender_address)
        if sender != bounty.creator and sender != self.admin:
            raise gl.vm.UserError("only bounty creator or admin")
        if bounty.status not in ("open", "judging"):
            raise gl.vm.UserError("bounty already finalized")

        scored: list[Submission] = []
        for sid in bounty.submission_ids:
            sub = self._load_submission(int(sid))
            if sub.has_score:
                scored.append(sub)

        scored.sort(key=lambda s: s.score.weighted, reverse=True)

        winners: list[u64] = []
        for i, sub in enumerate(scored[: bounty.winner_count]):
            sub.rank = i + 1
            sub.status = "winner"
            self._save_submission(sub)
            winners.append(sub.id)

        for sub in scored[bounty.winner_count :]:
            sub.status = "rejected"
            self._save_submission(sub)

        bounty.winners = DynArray[u256]([u256(w) for w in winners])
        bounty.status = "completed"
        self._save_bounty(bounty)
        return winners

    @gl.public.view
    def get_bounty(self, bounty_id: int) -> str:
        bounty = self._load_bounty(u64(bounty_id))
        if bounty is None:
            return ""
        return json.dumps(bounty.__dict__)

    @gl.public.view
    def get_submission(self, submission_id: int) -> str:
        submission = self._load_submission(u64(submission_id))
        if submission is None:
            return ""
        return json.dumps(submission.__dict__)
