import type { ChangeSummary } from "./types";

export function formatDay(takenAt: number): string {
  return new Date(takenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTime(takenAt: number): string {
  return new Date(takenAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatStamp(takenAt: number): string {
  return `${formatDay(takenAt)}, ${formatTime(takenAt)}`;
}

export function describeSummary(summary: ChangeSummary): string {
  const parts: string[] = [];
  const nodePart = (count: number, verb: string) => {
    if (count > 0) {
      parts.push(`${count} node${count === 1 ? "" : "s"} ${verb}`);
    }
  };
  nodePart(summary.addedNodes, "added");
  nodePart(summary.editedNodes, "edited");
  nodePart(summary.removedNodes, "removed");
  const edgeTotal = summary.addedEdges + summary.editedEdges + summary.removedEdges;
  if (edgeTotal > 0) {
    parts.push(`${edgeTotal} connection${edgeTotal === 1 ? "" : "s"}`);
  }
  const regionTotal = summary.changedRegions ?? 0;
  if (regionTotal > 0) {
    parts.push(`${regionTotal} region${regionTotal === 1 ? "" : "s"}`);
  }
  if (summary.renamed) {
    parts.push("renamed");
  }
  return parts.length > 0 ? parts.join(" · ") : "No structural changes";
}

export function changeCount(summary: ChangeSummary): number {
  return (
    summary.addedNodes +
    summary.editedNodes +
    summary.removedNodes +
    summary.addedEdges +
    summary.editedEdges +
    summary.removedEdges +
    (summary.changedRegions ?? 0) +
    (summary.renamed ? 1 : 0)
  );
}
