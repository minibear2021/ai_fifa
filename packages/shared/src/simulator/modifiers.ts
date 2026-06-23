import type { Player, Strategy, Formation } from "../schemas/index.js";

const FORMATION_MODIFIER: Record<Formation, number> = {
  "4-4-2": 0,
  "4-3-3": 1,
  "4-2-3-1": 1,
  "3-5-2": -1,
  "5-3-2": -2,
  "3-4-3": 0,
};

const MENTALITY_MODIFIER: Record<Strategy["mentality"], { attack: number; risk: number }> = {
  defensive: { attack: -0.2, risk: -0.1 },
  cautious: { attack: -0.1, risk: -0.05 },
  balanced: { attack: 0, risk: 0 },
  attacking: { attack: 0.15, risk: 0.1 },
  "all-out": { attack: 0.3, risk: 0.2 },
};

const STYLE_MODIFIER: Record<Strategy["style"], { possession: number; chanceQuality: number }> = {
  possession: { possession: 0.1, chanceQuality: 0.05 },
  "counter-attack": { possession: -0.05, chanceQuality: 0.1 },
  pressing: { possession: 0.05, chanceQuality: 0.05 },
  direct: { possession: -0.05, chanceQuality: 0 },
  "park-the-bus": { possession: -0.15, chanceQuality: -0.1 },
};

const POSITION_WEIGHTS: Record<Player["position"], { pace: number; shooting: number; passing: number; defending: number; stamina: number }> = {
  GK: { pace: 0.05, shooting: 0.05, passing: 0.2, defending: 0.5, stamina: 0.2 },
  DF: { pace: 0.2, shooting: 0.05, passing: 0.2, defending: 0.4, stamina: 0.15 },
  MF: { pace: 0.2, shooting: 0.15, passing: 0.3, defending: 0.2, stamina: 0.15 },
  FW: { pace: 0.3, shooting: 0.4, passing: 0.15, defending: 0.05, stamina: 0.1 },
};

export function playerRating(player: Player): number {
  const w = POSITION_WEIGHTS[player.position];
  return (
    player.pace * w.pace +
    player.shooting * w.shooting +
    player.passing * w.passing +
    player.defending * w.defending +
    player.stamina * w.stamina
  );
}

export function teamStrength(players: Player[]): number {
  if (players.length === 0) return 50;
  const sum = players.reduce((acc, p) => acc + playerRating(p), 0);
  return sum / players.length;
}

export type TacticalModifier = {
  possessionDelta: number;
  attackDelta: number;
  shotQualityDelta: number;
  foulRate: number;
  cardRate: number;
};

export function tacticalModifier(strategy: Strategy, isHome: boolean): TacticalModifier {
  const m = MENTALITY_MODIFIER[strategy.mentality];
  const s = STYLE_MODIFIER[strategy.style];
  const formation = FORMATION_MODIFIER[strategy.formation];

  return {
    possessionDelta: s.possession + (strategy.pressing - 50) * 0.002,
    attackDelta: m.attack + (strategy.pressing - 50) * 0.001,
    shotQualityDelta: s.chanceQuality + (strategy.passing_risk - 50) * 0.001,
    foulRate: 0.02 + (m.risk > 0 ? m.risk : 0) + (strategy.fouls_tactical ? 0.03 : 0),
    cardRate: 0.15 + (strategy.fouls_tactical ? 0.15 : 0),
  };
}
