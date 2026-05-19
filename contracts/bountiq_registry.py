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
class Score:
    innovation: u64
    technical: u64
    impact: u64
    presentation: u64
    weighted: u64
    reasoning: str


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
    payout_splits_json: str
    rubric: Rubric
    status: str
    deadline: u64
    submission_ids_json: str
    winners_json: str


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


def _to_jsonable(value):
    if hasattr(value, "__dataclass_fields__"):
        return {k: _to_jsonable(getattr(value, k)) for k in value.__dataclass_fields__}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v) for k, v in value.items()}
    try:
        return int(value)
    except (TypeError, ValueError):
        pass
    return value


def _get(obj, key):
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _norm_splits(payout_splits) -> list:
    out = []
    for s in payout_splits:
        out.append({
            "rank": int(_get(s, "rank") or 0),
            "percentage": int(_get(s, "percentage") or 0),
        })
    return out


def _norm_rubric(r) -> Rubric:
    return Rubric(
        innovation=u64(int(_get(r, "innovation") or 0)),
        technical=u64(int(_get(r, "technical") or 0)),
        impact=u64(int(_get(r, "impact") or 0)),
        presentation=u64(int(_get(r, "presentation") or 0)),
    )


def _bounty_to_dict(b: 'Bounty') -> dict:
    return {
        "id": int(b.id),
        "creator": b.creator,
        "title": b.title,
        "description": b.description,
        "reward_amount": int(b.reward_amount),
        "reward_token": b.reward_token,
        "winner_count": int(b.winner_count),
        "payout_splits": json.loads(b.payout_splits_json) if b.payout_splits_json else [],
        "rubric": {
            "innovation": int(b.rubric.innovation),
            "technical": int(b.rubric.technical),
            "impact": int(b.rubric.impact),
            "presentation": int(b.rubric.presentation),
        },
        "status": b.status,
        "deadline": int(b.deadline),
        "submission_ids": json.loads(b.submission_ids_json) if b.submission_ids_json else [],
        "winners": json.loads(b.winners_json) if b.winners_json else [],
    }


def _submission_to_dict(s: 'Submission') -> dict:
    return {
        "id": int(s.id),
        "bounty_id": int(s.bounty_id),
        "submitter": s.submitter,
        "title": s.title,
        "summary": s.summary,
        "content_url": s.content_url,
        "status": s.status,
        "has_score": bool(s.has_score),
        "rank": int(s.rank),
        "score": {
            "innovation": int(s.score.innovation),
            "technical": int(s.score.technical),
            "impact": int(s.score.impact),
            "presentation": int(s.score.presentation),
            "weighted": int(s.score.weighted),
            "reasoning": s.score.reasoning,
        },
    }


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

    @gl.public.view
    def get_bounty_count(self) -> int:
        return int(self.bounty_count)

    @gl.public.view
    def get_submission_count(self) -> int:
        return int(self.submission_count)

    @gl.public.write
    def create_bounty(
        self,
        title: str,
        description: str,
        reward_amount: int,
        reward_token: str,
        winner_count: int,
        payout_splits: list,
        rubric: dict,
        deadline: int,
    ) -> u64:
        self._require_creator()

        wc = int(winner_count)
        if wc < 1:
            raise gl.vm.UserError("winner_count must be >= 1")

        splits_norm = _norm_splits(payout_splits)
        if len(splits_norm) != wc:
            raise gl.vm.UserError("payout_splits length must match winner_count")
        total_split = sum(s["percentage"] for s in splits_norm)
        if total_split != 100:
            raise gl.vm.UserError("payout_splits must sum to 100")

        rubric_typed = _norm_rubric(rubric)
        total_weight = (
            int(rubric_typed.innovation)
            + int(rubric_typed.technical)
            + int(rubric_typed.impact)
            + int(rubric_typed.presentation)
        )
        if total_weight != 100:
            raise gl.vm.UserError("rubric weights must sum to 100")

        new_id = u64(int(self.bounty_count) + 1)
        self.bounty_count = u256(new_id)

        bounty = Bounty(
            id=new_id,
            creator=str(gl.message.sender_address),
            title=str(title),
            description=str(description),
            reward_amount=u256(int(reward_amount)),
            reward_token=str(reward_token),
            winner_count=u64(wc),
            payout_splits_json=json.dumps(splits_norm),
            rubric=rubric_typed,
            status="open",
            deadline=u64(int(deadline)),
            submission_ids_json="[]",
            winners_json="[]",
        )
        self.bounties[u256(new_id)] = bounty
        return new_id

    @gl.public.write
    def close_submissions(self, bounty_id: int) -> None:
        bid = int(bounty_id)
        bounty = self.bounties.get(u256(bid))
        if bounty is None:
            raise gl.vm.UserError("bounty not found")
        sender = str(gl.message.sender_address)
        if sender != bounty.creator and sender != self.admin:
            raise gl.vm.UserError("only bounty creator or admin")
        if bounty.status != "open":
            raise gl.vm.UserError("bounty not open")
        bounty.status = "judging"
        self.bounties[u256(bid)] = bounty

    @gl.public.write
    def submit_entry(
        self,
        bounty_id: int,
        title: str,
        summary: str,
        content_url: str,
    ) -> u64:
        bid = int(bounty_id)
        bounty = self.bounties.get(u256(bid))
        if bounty is None:
            raise gl.vm.UserError("bounty not found")
        if bounty.status != "open":
            raise gl.vm.UserError("bounty is not accepting submissions")

        new_id = u64(int(self.submission_count) + 1)
        self.submission_count = u256(new_id)

        submission = Submission(
            id=new_id,
            bounty_id=u64(bid),
            submitter=str(gl.message.sender_address),
            title=str(title),
            summary=str(summary),
            content_url=str(content_url),
            status="submitted",
            score=Score(innovation=u64(0), technical=u64(0), impact=u64(0), presentation=u64(0), weighted=u64(0), reasoning=""),
            has_score=False,
            rank=u64(0),
        )
        self.submissions[u256(new_id)] = submission

        ids = json.loads(bounty.submission_ids_json) if bounty.submission_ids_json else []
        ids.append(int(new_id))
        bounty.submission_ids_json = json.dumps(ids)
        self.bounties[u256(bid)] = bounty

        return new_id

    @gl.public.write
    def evaluate_submission(self, submission_id: int) -> None:
        sid = int(submission_id)
        submission = self.submissions.get(u256(sid))
        if submission is None:
            raise gl.vm.UserError("submission not found")
        if submission.status not in ("submitted", "scored"):
            raise gl.vm.UserError("submission cannot be re-evaluated in this state")

        bounty = self.bounties.get(u256(int(submission.bounty_id)))
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
            f"""- innovation (weight {int(rubric.innovation)}%)\n"""
            f"""- technical (weight {int(rubric.technical)}%)\n"""
            f"""- impact (weight {int(rubric.impact)}%)\n"""
            f"""- presentation (weight {int(rubric.presentation)}%)\n\n"""
            f"""Respond with ONLY a JSON object in this exact shape, no prose, no markdown:\n"""
            f"""{{\n"""
            f"""  \"innovation\": <int 0-100>,\n"""
            f"""  \"technical\": <int 0-100>,\n"""
            f"""  \"impact\": <int 0-100>,\n"""
            f"""  \"presentation\": <int 0-100>,\n"""
            f"""  \"reasoning\": \"<one or two sentence justification>\"\n"""
            f"""}}\n"""
        )

        principle = (
            "Scores for each criterion are equivalent if within 15 points of one another, "
            "and the overall judgment expressed in reasoning is consistent."
        )

        def _evaluate() -> str:
            return gl.nondet.exec_prompt(prompt, response_format="json")

        try:
            raw = gl.eq_principle.prompt_comparative(_evaluate, principle)
        except (AttributeError, TypeError):
            raw = gl.eq_principle.strict_eq(_evaluate)

        parsed = None
        if isinstance(raw, dict):
            parsed = raw
        else:
            text = "" if raw is None else str(raw)
            cleaned = text.strip()
            if cleaned.startswith("```"):
                nl = cleaned.find("\n")
                if nl >= 0:
                    cleaned = cleaned[nl + 1 :]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
            cleaned = cleaned.strip().strip("`").strip()
            try:
                parsed = json.loads(cleaned)
            except Exception:
                import re as _re
                repaired = _re.sub(r"([\"\d\]\}])\s*\"", r"\1, \"", cleaned)
                try:
                    parsed = json.loads(repaired)
                except Exception:
                    raise gl.vm.UserError("LLM returned invalid JSON: " + cleaned[:200])

        if not isinstance(parsed, dict):
            raise gl.vm.UserError("LLM evaluation result is not an object")

        innovation = int(parsed.get("innovation", 0))
        technical = int(parsed.get("technical", 0))
        impact = int(parsed.get("impact", 0))
        presentation = int(parsed.get("presentation", 0))
        reasoning = str(parsed.get("reasoning", ""))[:1000]

        weighted = (
            innovation * int(rubric.innovation)
            + technical * int(rubric.technical)
            + impact * int(rubric.impact)
            + presentation * int(rubric.presentation)
        ) // 100

        submission.score = Score(
            innovation=u64(max(0, min(100, innovation))),
            technical=u64(max(0, min(100, technical))),
            impact=u64(max(0, min(100, impact))),
            presentation=u64(max(0, min(100, presentation))),
            weighted=u64(max(0, min(100, weighted))),
            reasoning=reasoning,
        )
        submission.status = "scored"
        submission.has_score = True
        self.submissions[u256(int(submission.id))] = submission

    @gl.public.write
    def finalize_winners(self, bounty_id: int) -> list[int]:
        bid = int(bounty_id)
        bounty = self.bounties.get(u256(bid))
        if bounty is None:
            raise gl.vm.UserError("bounty not found")
        sender = str(gl.message.sender_address)
        if sender != bounty.creator and sender != self.admin:
            raise gl.vm.UserError("only bounty creator or admin")
        if bounty.status not in ("open", "judging"):
            raise gl.vm.UserError("bounty already finalized")

        ids = json.loads(bounty.submission_ids_json) if bounty.submission_ids_json else []
        scored = []
        for sid in ids:
            sub = self.submissions.get(u256(int(sid)))
            if sub is not None and sub.has_score:
                scored.append(sub)

        scored.sort(key=lambda s: int(s.score.weighted), reverse=True)

        wc = int(bounty.winner_count)
        winners = []
        for i, sub in enumerate(scored[:wc]):
            sub.rank = u64(i + 1)
            sub.status = "winner"
            self.submissions[u256(int(sub.id))] = sub
            winners.append(int(sub.id))

        for sub in scored[wc:]:
            sub.status = "rejected"
            self.submissions[u256(int(sub.id))] = sub

        bounty.winners_json = json.dumps(winners)
        bounty.status = "completed"
        self.bounties[u256(bid)] = bounty
        return winners

    @gl.public.view
    def get_bounty(self, bounty_id: int) -> str:
        bounty = self.bounties.get(u256(int(bounty_id)))
        if bounty is None:
            return ""
        return json.dumps(_bounty_to_dict(bounty))

    @gl.public.view
    def get_submission(self, submission_id: int) -> str:
        submission = self.submissions.get(u256(int(submission_id)))
        if submission is None:
            return ""
        return json.dumps(_submission_to_dict(submission))
