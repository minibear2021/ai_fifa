import type { MatchEvent } from "@ai-fifa/shared/schemas";

type Item = { text: string; tone: "neutral" | "goal" | "card" };

function format(ev: MatchEvent, home: string, away: string): Item {
  const team = "team" in ev && ev.team === "home" ? home : "team" in ev && ev.team === "away" ? away : "";
  const opp = "team" in ev && ev.team === "home" ? away : "team" in ev && ev.team === "away" ? home : "";
  switch (ev.type) {
    case "kickoff":
      return { text: `Kickoff · ${ev.team === "home" ? home : away}`, tone: "neutral" };
    case "halftime":
      return { text: `Halftime · ${ev.score[0]}–${ev.score[1]}`, tone: "neutral" };
    case "fulltime":
      return { text: `Fulltime · ${ev.score[0]}–${ev.score[1]}`, tone: "neutral" };
    case "goal":
      return {
        text: `GOAL · ${ev.scorer}${ev.assist ? ` (assist ${ev.assist})` : ""} · ${team}`,
        tone: "goal",
      };
    case "card":
      return { text: `${ev.color === "red" ? "RED" : "YELLOW"} · ${ev.player} · ${opp}`, tone: "card" };
    case "shot":
      return { text: `Shot · ${ev.taker} ${ev.on_target ? "(on target)" : ""}`, tone: "neutral" };
    case "foul":
      return { text: `Foul · ${ev.player}`, tone: "neutral" };
    case "attack":
      return { text: `Attack ${ev.success ? "succeeds" : "broken"} · ${team}`, tone: "neutral" };
    case "possession":
      return { text: `Possession · ${team}`, tone: "neutral" };
    case "possession_update":
      return { text: `Possession ${ev.home}–${ev.away}`, tone: "neutral" };
    case "substitution":
      return { text: `Sub · ${ev.out} → ${ev.in_} · ${team}`, tone: "neutral" };
    default: {
      const _exhaustive: never = ev;
      return { text: "event", tone: "neutral" };
    }
  }
}

type Props = {
  events: MatchEvent[];
  homeName: string;
  awayName: string;
};

export function MatchTicker({ events, homeName, awayName }: Props) {
  const items = events
    .filter((e) => e.type !== "possession")
    .map((e) => ({ minute: e.t, ...format(e, homeName, awayName) }));

  if (items.length === 0) {
    return (
      <div className="border-y border-line bg-panel h-9 flex items-center px-4">
        <span className="eyebrow">Match ticker</span>
        <span className="ml-4 text-dim text-sm">No events yet</span>
      </div>
    );
  }

  const tickerItems = [...items, ...items];

  return (
    <div className="border-y border-line bg-panel overflow-hidden">
      <div className="flex items-stretch">
        <div className="shrink-0 px-4 flex items-center border-r border-line">
          <span className="eyebrow text-pitch">Live</span>
          <span className="ml-2 pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-pitch" />
        </div>
        <div className="flex-1 overflow-hidden relative h-9">
          <div className="ticker-track flex items-center h-full whitespace-nowrap font-data text-[12px]">
            {tickerItems.map((it, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-5 ${
                  it.tone === "goal"
                    ? "text-pitch"
                    : it.tone === "card"
                      ? "text-card"
                      : "text-muted"
                }`}
              >
                <span className="text-dim mr-2 tabular-nums">{String(it.minute).padStart(2, "0")}'</span>
                {it.text}
                <span className="mx-4 text-dim/60">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
