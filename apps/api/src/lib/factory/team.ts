import type { Player, Strategy } from "@ai-fifa/shared/schemas";

const FIRST_NAMES = [
  "Alex", "Bruno", "Carlos", "Diego", "Erik", "Felipe", "Gabriel", "Hugo", "Ivan", "Javi",
  "Kai", "Leo", "Marc", "Nico", "Oscar", "Pablo", "Quinn", "Rafa", "Sergio", "Tomas",
  "Unai", "Viktor", "Wesley", "Xavi", "Yago", "Zane",
];

const LAST_NAMES = [
  "Alvarez", "Brown", "Costa", "Diaz", "Evans", "Fernandez", "Garcia", "Hernandez", "Ito",
  "Johnson", "Kovac", "Lopez", "Martinez", "Nakamura", "Oliveira", "Pereira", "Quintero",
  "Rossi", "Silva", "Tanaka", "Ueda", "Vargas", "Werner", "Yamada", "Zhang",
];

type Slot = { position: Player["position"]; n: number };
const FORMATION_442_SLOTS: Slot[] = [
  { position: "GK", n: 1 },
  { position: "DF", n: 4 },
  { position: "MF", n: 4 },
  { position: "FW", n: 2 },
];

function randInt(min: number, max: number, rng: () => number = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

type Stat = "pace" | "shooting" | "passing" | "defending" | "stamina";
const WEIGHTS: Record<Player["position"], Array<[Stat, number]>> = {
  GK: [["defending", 0.4], ["passing", 0.2], ["stamina", 0.2], ["pace", 0.1], ["shooting", 0.1]],
  DF: [["defending", 0.35], ["pace", 0.2], ["passing", 0.2], ["stamina", 0.15], ["shooting", 0.1]],
  MF: [["passing", 0.3], ["stamina", 0.25], ["defending", 0.2], ["pace", 0.15], ["shooting", 0.1]],
  FW: [["shooting", 0.35], ["pace", 0.25], ["passing", 0.2], ["stamina", 0.1], ["defending", 0.1]],
};

function generatePlayer(teamId: string, position: Player["position"], rng: () => number): Player {
  const stats: Record<Stat, number> = {
    pace: position === "GK" ? randInt(30, 55, rng) : randInt(50, 80, rng),
    shooting: position === "GK"
      ? randInt(20, 45, rng)
      : position === "DF"
        ? randInt(30, 60, rng)
        : randInt(50, 80, rng),
    passing: randInt(50, 80, rng),
    defending: position === "FW"
      ? randInt(20, 50, rng)
      : position === "MF"
        ? randInt(45, 75, rng)
        : randInt(50, 85, rng),
    stamina: randInt(60, 90, rng),
  };
  const overall = Math.min(99, Math.max(40, Math.round(
    WEIGHTS[position].reduce((acc, [k, w]) => acc + stats[k] * w, 0),
  )));

  return {
    id: crypto.randomUUID(),
    team_id: teamId,
    name: `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`,
    position,
    pace: stats.pace,
    shooting: stats.shooting,
    passing: stats.passing,
    defending: stats.defending,
    stamina: stats.stamina,
    overall,
  };
}

export function generateDefaultPlayers(teamId: string, rng: () => number = Math.random): Player[] {
  const out: Player[] = [];
  for (const slot of FORMATION_442_SLOTS) {
    for (let i = 0; i < slot.n; i++) {
      out.push(generatePlayer(teamId, slot.position, rng));
    }
  }
  return out;
}

export function defaultStrategy(teamId: string): Strategy {
  return {
    team_id: teamId,
    formation: "4-4-2",
    style: "possession",
    mentality: "balanced",
    pressing: 50,
    passing_risk: 50,
    width: 50,
    fouls_tactical: false,
    updated_at: Date.now(),
  };
}

type PlayerRow = {
  id: string;
  teamId: string;
  name: string;
  position: Player["position"];
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  stamina: number;
  overall: number;
};

type StrategyRow = Omit<Strategy, "team_id" | "updated_at" | "passing_risk" | "fouls_tactical"> & {
  teamId: string;
  passingRisk: number;
  foulsTactical: boolean;
  updatedAt: number;
};

export function toPlayerRow(p: Player): PlayerRow {
  return {
    id: p.id,
    teamId: p.team_id,
    name: p.name,
    position: p.position,
    pace: p.pace,
    shooting: p.shooting,
    passing: p.passing,
    defending: p.defending,
    stamina: p.stamina,
    overall: p.overall,
  };
}

export function toStrategyRow(s: Strategy): StrategyRow {
  return {
    teamId: s.team_id,
    formation: s.formation,
    style: s.style,
    mentality: s.mentality,
    pressing: s.pressing,
    passingRisk: s.passing_risk,
    width: s.width,
    foulsTactical: s.fouls_tactical,
    updatedAt: s.updated_at,
  };
}
