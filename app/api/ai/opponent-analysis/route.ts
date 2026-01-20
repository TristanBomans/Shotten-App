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
        const apiKey = process.env.MISTRAL_API_KEY;

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
            : 'onbekend';

        // Format top scorers
        const topScorersString = opponentPlayers.length > 0
            ? opponentPlayers
                .slice(0, 3)
                .map(p => `${p.name} (${p.goals} goals, ${p.assists} assists)`)
                .join(', ')
            : 'geen data';

        const prompt = `Je bent een futsal scout. Genereer een korte analyse (max 120 woorden, in het Nederlands).

BELANGRIJK:
- Gebruik GEEN markdown formatting zoals ** of _
- Gebruik lege regels tussen elke sectie voor leesbaarheid
- Schrijf in korte, krachtige zinnen

Format (met lege regel tussen elke sectie):
[Vergelijking van beide teams - 1-2 zinnen]

[Key players om op te letten - noem namen en waarom]

[Tactisch advies - concreet en actionable]

[Verdict - 1 zin conclusie]

Data:
Eigen team "${ownTeam.name}":
- Rang: #${ownTeam.rank ?? '?'}
- Punten: ${ownTeam.points ?? 0}
- Doelsaldo: ${(ownTeam.goalDifference ?? 0) >= 0 ? '+' : ''}${ownTeam.goalDifference ?? 0}
- W/D/L: ${ownTeam.wins ?? 0}/${ownTeam.draws ?? 0}/${ownTeam.losses ?? 0}

Tegenstander "${opponent.name}":
- Rang: #${opponent.rank ?? '?'}
- Punten: ${opponent.points ?? 0}
- Doelsaldo: ${(opponent.goalDifference ?? 0) >= 0 ? '+' : ''}${opponent.goalDifference ?? 0}
- W/D/L: ${opponent.wins ?? 0}/${opponent.draws ?? 0}/${opponent.losses ?? 0}
- Recente vorm: ${formString}
- Top scorers: ${topScorersString}

Schrijf direct de analyse zonder inleiding. Wees concreet en specifiek.`;

        const { Mistral } = await import('@mistralai/mistralai');
        const client = new Mistral({ apiKey });

        const response = await client.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            maxTokens: 250,
        });

        const analysis = response.choices?.[0]?.message?.content;

        if (!analysis) {
            throw new Error('No response from AI');
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
