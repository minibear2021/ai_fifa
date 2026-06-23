import type { MatchInput, MatchOutput, Rng, TeamSnapshot } from "./types.js";
import type { MatchEvent, MatchStats, Player, Strategy } from "../schemas/index.js";
import { teamStrength, tacticalModifier, playerRating } from "./modifiers.js";

const MINUTES = 90;
const HOME_ADVANTAGE = 1.5;
const BASE_POSSESSION = 0.5;
const BASE_ATTACK_RATE = 0.18;
const BASE_SHOT_RATE = 0.35;
const BASE_SHOOT_ACCURACY = 0.4;
const BASE_SAVE_RATE = 0.6;

const EMPTY_STATS: MatchStats = {
  home_possession: 50,
  away_possession: 50,
  home_shots: 0,
  away_shots: 0,
  home_shots_on_target: 0,
  away_shots_on_target: 0,
  home_corners: 0,
  away_corners: 0,
  home_fouls: 0,
  away_fouls: 0,
  home_yellow: 0,
  away_yellow: 0,
  home_red: 0,
  away_red: 0,
};

type Side = "home" | "away";
type Team = { snapshot: TeamSnapshot; players: Player[]; strategy: Strategy; strength: number; mod: ReturnType<typeof tacticalModifier> };

type RatingKey = "shooting" | "defending" | "passing";

function pickPlayer(players: Player[], ratingKey: RatingKey, rng: Rng): Player {
  const eligible = players.filter((p) => p[ratingKey] > 0);
  if (eligible.length === 0) return players[0]!;
  const weights = eligible.map((p) => p[ratingKey]);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return eligible[i]!;
  }
  return eligible[eligible.length - 1]!;
}

export function runMatch(input: MatchInput, rng: Rng): MatchOutput {
  const home: Team = {
    snapshot: input.home,
    players: input.home.players,
    strategy: input.homeStrategy,
    strength: teamStrength(input.home.players) + (input.home.isHome ? HOME_ADVANTAGE : 0),
    mod: tacticalModifier(input.homeStrategy, input.home.isHome),
  };
  const away: Team = {
    snapshot: input.away,
    players: input.away.players,
    strategy: input.awayStrategy,
    strength: teamStrength(input.away.players),
    mod: tacticalModifier(input.awayStrategy, false),
  };

  const events: MatchEvent[] = [];
  const stats: MatchStats = { ...EMPTY_STATS };
  let homeGoals = 0;
  let awayGoals = 0;
  let homePossessionCount = 0;
  let awayPossessionCount = 0;

  const strengthDelta = (home.strength - away.strength) / 200;
  const homePossessionBase = clamp(BASE_POSSESSION + strengthDelta + (home.mod.possessionDelta - away.mod.possessionDelta) / 2, 0.25, 0.75);
  const awayPossessionBase = 1 - homePossessionBase;

  events.push({ t: 0, type: "kickoff", team: "home" });

  for (let minute = 1; minute <= MINUTES; minute++) {
    const homePoss = rng() < homePossessionBase;
    if (homePoss) homePossessionCount++; else awayPossessionCount++;

    const attacking: Side = homePoss ? "home" : "away";
    const attackTeam: Team = homePoss ? home : away;
    const defendTeam: Team = homePoss ? away : home;

    if (rng() < BASE_ATTACK_RATE + attackTeam.mod.attackDelta) {
      const shotRate = BASE_SHOT_RATE + (attackTeam.strength - defendTeam.strength) / 400;
      if (rng() < shotRate) {
        const taker = pickPlayer(attackTeam.players, "shooting", rng);
        const onTarget = rng() < BASE_SHOOT_ACCURACY + attackTeam.mod.shotQualityDelta * 0.2;
        const xG = clamp((taker.shooting / 100) * 0.4 + (attackTeam.strength - defendTeam.strength) / 400, 0.05, 0.9);

        if (attacking === "home") {
          stats.home_shots++;
          if (onTarget) stats.home_shots_on_target++;
        } else {
          stats.away_shots++;
          if (onTarget) stats.away_shots_on_target++;
        }

        events.push({
          t: minute,
          type: "shot",
          team: attacking,
          on_target: onTarget,
          xg: xG,
          taker: taker.name,
        });

        if (onTarget) {
          const saveRate = BASE_SAVE_RATE + (defendTeam.strength - attackTeam.strength) / 300;
          if (rng() > saveRate) {
            const scorer = taker;
            const assistRoll = rng();
            const assist = assistRoll < 0.5 ? pickPlayer(attackTeam.players, "passing", rng) : undefined;
            if (attacking === "home") homeGoals++; else awayGoals++;
            events.push({
              t: minute,
              type: "goal",
              team: attacking,
              scorer: scorer.name,
              ...(assist ? { assist: assist.name } : {}),
              minute,
            });
          }
        } else if (rng() < 0.15) {
          if (attacking === "home") stats.home_corners++; else stats.away_corners++;
        }
      } else {
        events.push({ t: minute, type: "attack", team: attacking, success: false });
      }
    }

    if (rng() < attackTeam.mod.foulRate) {
      const fouler = pickPlayer(defendTeam.players, "defending", rng);
      if (attacking === "home") stats.home_fouls++; else stats.away_fouls++;
      events.push({ t: minute, type: "foul", team: attacking === "home" ? "away" : "home", player: fouler.name });
      if (rng() < attackTeam.mod.cardRate) {
        const isRed = rng() < 0.05;
        if (attacking === "home") {
          if (isRed) stats.home_red++; else stats.home_yellow++;
        } else {
          if (isRed) stats.away_red++; else stats.away_yellow++;
        }
        events.push({
          t: minute,
          type: "card",
          team: attacking === "home" ? "away" : "home",
          player: fouler.name,
          color: isRed ? "red" : "yellow",
        });
      }
    }

    if (minute === 45) {
      events.push({ t: 45, type: "halftime", score: [homeGoals, awayGoals] });
      const totalP = homePossessionCount + awayPossessionCount || 1;
      events.push({
        t: 45,
        type: "possession_update",
        home: Math.round((homePossessionCount / totalP) * 100),
        away: Math.round((awayPossessionCount / totalP) * 100),
      });
    }
  }

  const totalP = homePossessionCount + awayPossessionCount || 1;
  stats.home_possession = Math.round((homePossessionCount / totalP) * 100);
  stats.away_possession = 100 - stats.home_possession;

  events.push({
    t: 90,
    type: "possession_update",
    home: stats.home_possession,
    away: stats.away_possession,
  });
  events.push({ t: 90, type: "fulltime", score: [homeGoals, awayGoals] });

  return {
    events,
    stats,
    finalScore: [homeGoals, awayGoals],
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
