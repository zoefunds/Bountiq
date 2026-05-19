import type { Timestamp } from "firebase/firestore";

export type UserRole = "submitter" | "creator" | "judge" | "admin";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  walletAddress: string | null;
  roles: UserRole[];
  reputation: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type BountyStatus = "draft" | "open" | "judging" | "completed" | "cancelled";

export interface RubricWeights {
  innovation: number;
  technical: number;
  impact: number;
  presentation: number;
}

export interface PayoutSplit {
  rank: number;
  percentage: number;
}

export interface Bounty {
  id: string;
  creatorUid: string;
  title: string;
  description: string;
  rewardAmount: number;
  rewardToken: string;
  winnerCount: number;
  payoutSplits: PayoutSplit[];
  rubric: RubricWeights;
  status: BountyStatus;
  contractAddress: string | null;
  onChainBountyId: string | null;
  submissionCount: number;
  deadline: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SubmissionStatus =
  | "submitted"
  | "evaluating"
  | "scored"
  | "shortlisted"
  | "winner"
  | "rejected";

export interface SubmissionScore {
  innovation: number;
  technical: number;
  impact: number;
  presentation: number;
  weighted: number;
  reasoning: string;
  evaluatedAt: Timestamp;
}

export interface Submission {
  id: string;
  bountyId: string;
  submitterUid: string;
  title: string;
  summary: string;
  contentUrl: string | null;
  attachments: string[];
  status: SubmissionStatus;
  score: SubmissionScore | null;
  rank: number | null;
  isWinner: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuditEvent {
  id: string;
  actorUid: string;
  action: string;
  targetType: "bounty" | "submission" | "user" | "system";
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
}
