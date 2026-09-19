/** Cached scouting reports older than this are regenerated on the next request. */
export const AI_ANALYSIS_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export function isAiAnalysisStale(generatedAt: string | null | undefined): boolean {
    if (!generatedAt) return true;
    const timestamp = Date.parse(generatedAt);
    if (Number.isNaN(timestamp)) return true;
    return Date.now() - timestamp > AI_ANALYSIS_MAX_AGE_MS;
}
