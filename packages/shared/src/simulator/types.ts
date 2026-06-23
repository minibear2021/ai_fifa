import type { Player, Strategy, MatchEvent, MatchStats } from "../schemas/index.js";

export type TeamSnapshot = {
  id: string;
  name: string;
  rating: number;
  players: Player[];
  isHome: boolean;
};

export type MatchInput = {
  matchId: string;
  home: TeamSnapshot;
  away: TeamSnapshot;
  homeStrategy: Strategy;
  awayStrategy: Strategy;
};

export type MatchOutput = {
  events: MatchEvent[];
  stats: MatchStats;
  finalScore: [number, number];
};

export type Rng = () => number;
