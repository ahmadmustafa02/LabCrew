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
  /** Phase A: allow structured CSV/form data on this assignment */
  acceptData?: boolean;
  /** Phase B+: require at least one data row when submitting */
  requireData?: boolean;
};

export type DataColumnType = "text" | "number" | "boolean";

export type AssignmentDataSchema = {
  columns: Array<{ name: string; type: DataColumnType }>;
};

export const ROLE_STORAGE_KEY = "labcrew.role";
export const STUDENT_MEMBER_STORAGE_KEY = "labcrew.studentMemberId";
