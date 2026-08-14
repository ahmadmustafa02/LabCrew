export type SessionRole = "director" | "student";

export type MaterialItem = {
  id: string;
  title: string;
  kind: "link" | "file";
  url: string;
};

export type AssignmentRubric = {
  requireEvidenceUrl?: boolean;
  requireWriteup?: boolean;
  requireRepoUrl?: boolean;
  minWriteupLength?: number;
  checklist?: string[];
};

export const ROLE_STORAGE_KEY = "labcrew.role";
export const STUDENT_MEMBER_STORAGE_KEY = "labcrew.studentMemberId";
