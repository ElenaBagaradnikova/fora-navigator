import { administrativeKnowledge } from "@/lib/knowledge/asturias";
import type { SourceReference } from "@/lib/schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SourceReviewItem = SourceReference & {
  daysUntilReview: number;
  overdue: boolean;
};

export function getSourcesDueWithin(asOf = new Date(), windowDays = 0): SourceReviewItem[] {
  const start = new Date(`${asOf.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  const limit = start + windowDays * DAY_MS;

  return administrativeKnowledge
    .map((entry) => {
      const reviewTime = new Date(`${entry.source.nextReviewDate}T00:00:00Z`).getTime();
      return {
        ...entry.source,
        daysUntilReview: Math.ceil((reviewTime - start) / DAY_MS),
        overdue: reviewTime < start,
      };
    })
    .filter((source) => new Date(`${source.nextReviewDate}T00:00:00Z`).getTime() <= limit)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
}

export function formatReviewEmail(items: SourceReviewItem[], asOf = new Date()) {
  const date = asOf.toISOString().slice(0, 10);
  const lines = items.map(
    (source) =>
      `- ${source.title}\n  Review date: ${source.nextReviewDate}${source.overdue ? " (OVERDUE)" : ""}\n  ${source.url}`,
  );
  return `FORA Navigator knowledge review — ${date}\n\n${lines.join("\n\n")}\n\nAfter checking each official page, update lastVerifiedDate and nextReviewDate in lib/knowledge/asturias.ts.`;
}
