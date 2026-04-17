import { describe, expect, it } from "vitest";
import { filterUpcomingMatches, resolveAttendanceLabel, withPlayerAttendance } from "./matches";
import type { Match } from "./types";

function buildMatch(id: number, date: string): Match {
  return {
    id,
    date,
    location: "Test Hall",
    name: `Match ${id}`,
    teamName: "Shotten FC",
    teamId: 1,
    attendances: []
  };
}

describe("filterUpcomingMatches", () => {
  it("keeps only upcoming matches and sorts ascending", () => {
    const now = new Date("2026-04-17T12:00:00.000Z").getTime();
    const matches = [
      buildMatch(1, "2026-04-20T12:00:00.000Z"),
      buildMatch(2, "2026-04-16T12:00:00.000Z"),
      buildMatch(3, "2026-04-18T12:00:00.000Z")
    ];

    const result = filterUpcomingMatches(matches, now);

    expect(result.map((item) => item.id)).toEqual([3, 1]);
  });
});

describe("resolveAttendanceLabel", () => {
  it("maps Maybe to Dutch undecided label", () => {
    expect(resolveAttendanceLabel("Maybe")).toBe("Nog niet beslist");
  });
});

describe("withPlayerAttendance", () => {
  it("updates existing attendance without mutating original object", () => {
    const match: Match = {
      id: 10,
      date: "2026-04-20T12:00:00.000Z",
      location: "Test Hall",
      name: "Test",
      teamName: "Shotten FC",
      teamId: 1,
      attendances: [
        {
          matchId: 10,
          playerId: 9,
          player: null,
          status: "Maybe"
        }
      ]
    };

    const result = withPlayerAttendance(match, 9, "Present");

    expect(result.attendances[0]?.status).toBe("Present");
    expect(match.attendances[0]?.status).toBe("Maybe");
  });
});
