/**
 * Shared types for the system-change-request workflow, matching
 * sysops/serializers.py's SystemChangeRequestSerializer /
 * SystemChangeRequestProgressUpdateSerializer — used by both the admin
 * queue (SystemRequestsManager.tsx) and the officer's own view
 * (mine/MyRequestsManager.tsx).
 */

export type ProgressStage = "reviewing" | "in_development" | "testing" | "deployed";

export type ProgressUpdateRow = {
  id: number;
  stage: ProgressStage;
  note: string;
  updated_by_name: string | null;
  created_at: string;
};

export type RequestStatus =
  | "pending"
  | "payment_pending"
  | "token_issued"
  | "in_progress"
  | "completed"
  | "rejected";

export type SystemRequestRow = {
  id: number;
  requested_by: string;
  requested_by_name: string | null;
  title: string;
  description: string;
  status: RequestStatus;
  fee_amount: string | null;
  currency: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  rejection_reason: string;
  token: string | null;
  token_issued_at: string | null;
  submitted_at: string;
  updated_at: string;
  progress_updates: ProgressUpdateRow[];
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  payment_pending: "Payment Pending",
  token_issued: "Token Issued",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

export const STAGE_LABEL: Record<ProgressStage, string> = {
  reviewing: "Reviewing",
  in_development: "In Development",
  testing: "Testing",
  deployed: "Deployed",
};
