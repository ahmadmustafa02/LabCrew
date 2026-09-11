import type {
  AssignmentDataSchema,
  AssignmentRubric,
  MaterialItem,
} from "@/lib/assignment-types";

export type AssignmentFormState = {
  title: string;
  description: string;
  instructions: string;
  dueAt: string;
  materials: MaterialItem[];
  requireEvidenceUrl: boolean;
  requireWriteup: boolean;
  requireRepoUrl: boolean;
  acceptData: boolean;
  requireData: boolean;
  dataColumnsText: string;
  minWriteupLength: number;
  checklistText: string;
  audience: "ALL" | "SELECTED";
  selectedMemberIds: string[];
};

export const DEFAULT_ASSIGNMENT_FORM: AssignmentFormState = {
  title: "",
  description: "",
  instructions: "",
  dueAt: "",
  materials: [],
  requireEvidenceUrl: true,
  requireWriteup: true,
  requireRepoUrl: false,
  acceptData: false,
  requireData: false,
  dataColumnsText: "sample_id:text\nod600:number\nhours:number",
  minWriteupLength: 40,
  checklistText:
    "Demo runs locally or is publicly reachable\nShort methods + results writeup",
  audience: "ALL",
  selectedMemberIds: [],
};

export function parseDataColumnsText(text: string): AssignmentDataSchema {
  return {
    columns: text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [nameRaw, typeRaw] = line.split(":");
        const name = (nameRaw ?? "").trim();
        const type =
          typeRaw?.trim().toLowerCase() === "number"
            ? "number"
            : typeRaw?.trim().toLowerCase() === "boolean"
              ? "boolean"
              : "text";
        return { name, type: type as "text" | "number" | "boolean" };
      })
      .filter((c) => c.name),
  };
}

export function dataColumnsToText(schema: AssignmentDataSchema | null | undefined): string {
  if (!schema?.columns?.length) return "";
  return schema.columns.map((c) => `${c.name}:${c.type}`).join("\n");
}

export function formToPayload(form: AssignmentFormState) {
  const checklist = form.checklistText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const dataSchema = form.acceptData ? parseDataColumnsText(form.dataColumnsText) : null;
  return {
    title: form.title,
    description: form.description,
    instructions: form.instructions,
    dueAt: form.dueAt || null,
    materials: form.materials,
    dataSchema,
    rubric: {
      requireEvidenceUrl: form.requireEvidenceUrl,
      requireWriteup: form.requireWriteup,
      requireRepoUrl: form.requireRepoUrl,
      minWriteupLength: form.minWriteupLength,
      checklist,
      acceptData: form.acceptData,
      requireData: form.acceptData && form.requireData,
    } satisfies AssignmentRubric,
    audience: form.audience,
    memberIds: form.audience === "SELECTED" ? form.selectedMemberIds : [],
  };
}

export function assignmentToForm(input: {
  title?: string | null;
  description?: string | null;
  instructions?: string | null;
  dueAt?: string | null;
  materials?: MaterialItem[] | null;
  rubric?: AssignmentRubric | null;
  dataSchema?: AssignmentDataSchema | null;
  audience?: "ALL" | "SELECTED" | null;
  assigneeIds?: string[];
  dueAs?: "date" | "datetime";
}): AssignmentFormState {
  const rubric = input.rubric ?? {};
  let dueAt = "";
  if (input.dueAt) {
    const d = new Date(input.dueAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    if (input.dueAs === "datetime") {
      dueAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
      dueAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }
  return {
    ...DEFAULT_ASSIGNMENT_FORM,
    title: input.title ?? "",
    description: input.description ?? "",
    instructions: input.instructions ?? "",
    dueAt,
    materials: Array.isArray(input.materials) ? input.materials : [],
    requireEvidenceUrl: rubric.requireEvidenceUrl !== false,
    requireWriteup: rubric.requireWriteup !== false,
    requireRepoUrl: Boolean(rubric.requireRepoUrl),
    acceptData: Boolean(rubric.acceptData),
    requireData: Boolean(rubric.requireData),
    dataColumnsText:
      dataColumnsToText(input.dataSchema) || DEFAULT_ASSIGNMENT_FORM.dataColumnsText,
    minWriteupLength: rubric.minWriteupLength ?? 40,
    checklistText: (rubric.checklist ?? []).join("\n"),
    audience: input.audience === "SELECTED" ? "SELECTED" : "ALL",
    selectedMemberIds: input.assigneeIds ?? [],
  };
}
