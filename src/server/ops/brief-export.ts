type BriefExportInput = {
  programName: string;
  milestone: string | null;
  students: number;
  turnedIn: number;
  submissionRate: number;
  briefing: string | null;
  agenda: string[];
  dataSummary?: {
    line: string;
    columns: Array<{
      columnName: string;
      sampleSize: number;
      mean: number | null;
      outlierCheck: { status: string; minRequired: number; flaggedCount: number };
    }>;
  } | null;
  stats: {
    onTrack: number;
    students: number;
    exceptions: number;
    draftNudges: number;
  } | null;
  exceptions: Array<{ name: string; reason: string; severity: string }>;
  pendingApprovals: Array<{
    title: string;
    body: string;
    targetName: string | null;
  }>;
  runFinishedAt: string | null;
};

export function briefToMarkdown(b: BriefExportInput) {
  const when = b.runFinishedAt
    ? new Date(b.runFinishedAt).toLocaleString()
    : "—";
  const lines: string[] = [
    `# Monday Brief — ${b.programName}`,
    "",
    `Generated: ${when}`,
    b.milestone ? `Active milestone: **${b.milestone}**` : "",
    "",
    `Submission rate: **${b.submissionRate}%** (${b.turnedIn}/${b.students})`,
    "",
  ];

  if (b.stats) {
    lines.push(
      "## Cohort snapshot",
      "",
      `- On track: ${b.stats.onTrack}`,
      `- Exceptions: ${b.stats.exceptions}`,
      `- Draft nudges: ${b.stats.draftNudges}`,
      "",
    );
  }

  if (b.dataSummary?.line) {
    lines.push("## Cohort data", "", b.dataSummary.line, "");
    for (const c of b.dataSummary.columns) {
      const flag =
        c.outlierCheck.status === "insufficient_sample"
          ? `IQR pending (need ${c.outlierCheck.minRequired}+)`
          : c.outlierCheck.flaggedCount > 0
            ? `${c.outlierCheck.flaggedCount} flagged`
            : "no IQR flags";
      const mean =
        c.mean === null
          ? "—"
          : Number.isInteger(c.mean)
            ? String(c.mean)
            : c.mean.toFixed(3);
      lines.push(`- **${c.columnName}**: n=${c.sampleSize}, mean=${mean}, ${flag}`);
    }
    lines.push("");
  }

  if (b.briefing) {
    lines.push("## Director briefing", "", b.briefing, "");
  }

  if (b.agenda.length) {
    lines.push("## Standup agenda", "");
    for (const item of b.agenda) lines.push(`- ${item}`);
    lines.push("");
  }

  if (b.exceptions.length) {
    lines.push("## Exceptions", "");
    for (const ex of b.exceptions) {
      lines.push(`- **${ex.name}** (${ex.severity}): ${ex.reason}`);
    }
    lines.push("");
  }

  if (b.pendingApprovals.length) {
    lines.push("## Pending Coach drafts", "");
    for (const a of b.pendingApprovals) {
      lines.push(`### ${a.targetName ?? a.title}`, "", a.body, "");
    }
  }

  lines.push("---", "", "_Exported from LabCrew_");
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}
