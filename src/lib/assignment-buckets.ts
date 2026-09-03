/** Bucket assignments like Teams: Upcoming / Past due / Completed */

export type AssignmentBucket = "upcoming" | "past_due" | "completed";

export type BucketableAssignment = {
  dueAt: string | null;
  status: string;
  myStatus: string | null;
  myReviewStatus: string | null;
  submissionCount: number;
  studentCount: number;
  approved: number;
};

export function isTurnedIn(a: BucketableAssignment) {
  return a.myStatus === "SUBMITTED" || a.myStatus === "SCORED";
}

export function isStudentCompleted(a: BucketableAssignment) {
  if (a.myReviewStatus === "NEEDS_REVISION") return false;
  if (
    a.myReviewStatus === "APPROVED" ||
    a.myReviewStatus === "DONE"
  ) {
    return true;
  }
  // Pending review after turn-in still counts as "in progress" for students
  // who need to see it under Upcoming until approved — keep turned-in without
  // terminal review in upcoming/past_due by due date, not Completed.
  if (a.myReviewStatus === "PENDING_REVIEW") return false;
  return isTurnedIn(a) && !a.myReviewStatus;
}

export function isDirectorCompleted(a: BucketableAssignment) {
  if (a.status === "CLOSED") return true;
  if (a.studentCount > 0 && a.approved >= a.studentCount) return true;
  return false;
}

export function assignmentBucket(
  a: BucketableAssignment,
  role: "director" | "student",
): AssignmentBucket {
  const completed =
    role === "student" ? isStudentCompleted(a) : isDirectorCompleted(a);
  if (completed) return "completed";

  const due = a.dueAt ? new Date(a.dueAt).getTime() : null;
  const now = Date.now();
  if (due != null && due < now) return "past_due";
  return "upcoming";
}

export function formatDueLabel(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDueGroup(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
