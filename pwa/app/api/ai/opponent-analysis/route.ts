import { NextRequest, NextResponse } from 'next/server';

interface TeamData {
    name: string;
    rank?: number;
    points?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goalDifference?: number;
}

interface PlayerData {
    name: string;
    goals: number;
    assists: number;
}

interface AnalysisRequest {
    ownTeam: TeamData;
    opponent: TeamData;
    opponentPlayers: PlayerData[];
    recentForm: ('W' | 'L' | 'D')[];
}

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 503 }
            );
        }

        const body: AnalysisRequest = await request.json();
        const { ownTeam, opponent, opponentPlayers, recentForm } = body;

        if (!ownTeam || !opponent) {
            return NextResponse.json(
                { error: 'Missing team data' },
                { status: 400 }
            );
        }

        // Format recent form string
        const formString = recentForm.length > 0
            ? recentForm.join('-')
            : 'unknown';

        // Format top scorers
        const topScorersString = opponentPlayers.length > 0
            ? opponentPlayers
                .slice(0, 3)
                .map(p => `${p.name} (${p.goals} goals, ${p.assists} assists)`)
                .join(', ')
            : 'no data';

        const prompt = `You are a futsal scout. Generate a short analysis (max 120 words, in English).

IMPORTANT:
- Do NOT use markdown formatting like ** or _
- Use blank lines between each section for readability
- Write in short, punchy sentences

Format (with blank line between each section):
[Comparison of both teams - 1-2 sentences]

[Key players to watch - mention names and why]

[Tactical advice - concrete and actionable]

[Verdict - 1 sentence conclusion]

Data:
Own team "${ownTeam.name}":
- Rank: #${ownTeam.rank ?? '?'}
- Points: ${ownTeam.points ?? 0}
- Goal difference: ${(ownTeam.goalDifference ?? 0) >= 0 ? '+' : ''}${ownTeam.goalDifference ?? 0}
- W/D/L: ${ownTeam.wins ?? 0}/${ownTeam.draws ?? 0}/${ownTeam.losses ?? 0}

Opponent "${opponent.name}":
- Rank: #${opponent.rank ?? '?'}
- Points: ${opponent.points ?? 0}
- Goal difference: ${(opponent.goalDifference ?? 0) >= 0 ? '+' : ''}${opponent.goalDifference ?? 0}
- W/D/L: ${opponent.wins ?? 0}/${opponent.draws ?? 0}/${opponent.losses ?? 0}
- Recent form: ${formString}
- Top scorers: ${topScorersString}

Write the analysis directly without introduction. Be concrete and specific.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://shotten.taltiko.com',
                'X-Title': 'Shotten opponent analysis',
            },
            body: JSON.stringify({
                model: 'openai/gpt-5.6-luna',
                messages: [{ role: 'user', content: prompt }],
                reasoning: { effort: 'low', exclude: true },
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const details = (await response.text()).slice(0, 500);
            throw new Error(`OpenRouter returned ${response.status}: ${details}`);
        }

        const result = await response.json() as {
            choices?: { message?: { content?: string } }[];
        };
        const analysis = result.choices?.[0]?.message?.content;

        if (!analysis) {
            throw new Error('No response from OpenRouter');
        }

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error('AI opponent analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to generate analysis' },
            { status: 500 }
        );
    }
}
