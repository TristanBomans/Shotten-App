'use client';

import type { MatchResult } from '@/lib/mockData';

const outcomeLabels: Record<MatchResult['outcome'], string> = {
    W: 'Win',
    L: 'Loss',
    D: 'Draw',
};

/** Compact W/L/D + scoreline for a finished match card. Scores read home–away, like the title. */
export function MatchResultBadge({ result }: { result: MatchResult }) {
    return (
        <span
            className="result-badge"
            data-outcome={result.outcome}
            aria-label={`${outcomeLabels[result.outcome]}, ${result.homeScore} to ${result.awayScore}`}
        >
            <span className="result-badge-outcome" aria-hidden>{result.outcome}</span>
            <span className="t-num" aria-hidden>
                {result.homeScore}–{result.awayScore}
            </span>
        </span>
    );
}

interface MatchScoreboardProps {
    /** Without an outcome (no team perspective) the score shows in neutral tones. */
    result: Pick<MatchResult, 'homeScore' | 'awayScore'> & { outcome?: MatchResult['outcome'] };
    homeTeam: string;
    awayTeam: string;
}

/** Full-width final score for the match page. */
export function MatchScoreboard({ result, homeTeam, awayTeam }: MatchScoreboardProps) {
    return (
        <div className="panel scoreboard" data-outcome={result.outcome}>
            <span className="scoreboard-team">{homeTeam}</span>
            <span className="scoreboard-score t-num">
                {result.homeScore}
                <span aria-hidden>–</span>
                {result.awayScore}
            </span>
            <span className="scoreboard-team">{awayTeam}</span>
            {result.outcome && (
                <span className="scoreboard-outcome">{outcomeLabels[result.outcome]}</span>
            )}
        </div>
    );
}
