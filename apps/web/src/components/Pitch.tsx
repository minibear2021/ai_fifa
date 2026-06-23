import type { Formation, Player } from "@ai-fifa/shared/schemas";

const FORMATIONS: Record<Formation, Array<{ role: "GK" | "DF" | "MF" | "FW"; x: number; y: number }>> = {
  "4-4-2": [
    { role: "GK", x: 8, y: 35 },
    { role: "DF", x: 30, y: 12 },
    { role: "DF", x: 30, y: 27 },
    { role: "DF", x: 30, y: 43 },
    { role: "DF", x: 30, y: 58 },
    { role: "MF", x: 55, y: 12 },
    { role: "MF", x: 55, y: 27 },
    { role: "MF", x: 55, y: 43 },
    { role: "MF", x: 55, y: 58 },
    { role: "FW", x: 82, y: 27 },
    { role: "FW", x: 82, y: 43 },
  ],
  "4-3-3": [
    { role: "GK", x: 8, y: 35 },
    { role: "DF", x: 30, y: 12 },
    { role: "DF", x: 30, y: 27 },
    { role: "DF", x: 30, y: 43 },
    { role: "DF", x: 30, y: 58 },
    { role: "MF", x: 55, y: 22 },
    { role: "MF", x: 55, y: 35 },
    { role: "MF", x: 55, y: 48 },
    { role: "FW", x: 85, y: 15 },
    { role: "FW", x: 85, y: 35 },
    { role: "FW", x: 85, y: 55 },
  ],
  "3-5-2": [
    { role: "GK", x: 8, y: 35 },
    { role: "DF", x: 28, y: 18 },
    { role: "DF", x: 28, y: 35 },
    { role: "DF", x: 28, y: 52 },
    { role: "MF", x: 50, y: 8 },
    { role: "MF", x: 50, y: 25 },
    { role: "MF", x: 50, y: 35 },
    { role: "MF", x: 50, y: 45 },
    { role: "MF", x: 50, y: 62 },
    { role: "FW", x: 82, y: 25 },
    { role: "FW", x: 82, y: 45 },
  ],
  "4-2-3-1": [
    { role: "GK", x: 8, y: 35 },
    { role: "DF", x: 30, y: 12 },
    { role: "DF", x: 30, y: 27 },
    { role: "DF", x: 30, y: 43 },
    { role: "DF", x: 30, y: 58 },
    { role: "MF", x: 52, y: 25 },
    { role: "MF", x: 52, y: 45 },
    { role: "MF", x: 70, y: 12 },
    { role: "MF", x: 70, y: 35 },
    { role: "MF", x: 70, y: 58 },
    { role: "FW", x: 88, y: 35 },
  ],
  "5-3-2": [
    { role: "GK", x: 8, y: 35 },
    { role: "DF", x: 28, y: 8 },
    { role: "DF", x: 28, y: 22 },
    { role: "DF", x: 28, y: 35 },
    { role: "DF", x: 28, y: 48 },
    { role: "DF", x: 28, y: 62 },
    { role: "MF", x: 55, y: 22 },
    { role: "MF", x: 55, y: 35 },
    { role: "MF", x: 55, y: 48 },
    { role: "FW", x: 82, y: 25 },
    { role: "FW", x: 82, y: 45 },
  ],
  "3-4-3": [
    { role: "GK", x: 8, y: 35 },
    { role: "DF", x: 28, y: 18 },
    { role: "DF", x: 28, y: 35 },
    { role: "DF", x: 28, y: 52 },
    { role: "MF", x: 55, y: 12 },
    { role: "MF", x: 55, y: 28 },
    { role: "MF", x: 55, y: 42 },
    { role: "MF", x: 55, y: 58 },
    { role: "FW", x: 85, y: 15 },
    { role: "FW", x: 85, y: 35 },
    { role: "FW", x: 85, y: 55 },
  ],
};

export type PitchTeam = {
  formation: Formation;
  players?: Player[];
  primary: string;
  secondary: string;
  label?: string;
};

type Props = {
  home: PitchTeam;
  away?: PitchTeam;
  size?: "sm" | "md" | "lg";
  highlightRole?: { team: "home" | "away"; role: "GK" | "DF" | "MF" | "FW" };
};

const SIZE = {
  sm: "h-44",
  md: "h-80",
  lg: "h-[28rem]",
} as const;

function mirrored(formation: Formation) {
  return FORMATIONS[formation].map((p) => ({ ...p, x: 100 - p.x }));
}

export function Pitch({ home, away, size = "md", highlightRole }: Props) {
  const homeNodes = FORMATIONS[home.formation];
  const awayNodes = away ? mirrored(away.formation) : null;

  const homeLabel = home.label ?? "Home";
  const awayLabel = away?.label ?? "Away";

  return (
    <div className={`relative w-full ${SIZE[size]}`}>
      <svg
        viewBox="0 0 100 70"
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label={`Pitch diagram: ${homeLabel}${away ? " vs " + awayLabel : ""}`}
      >
        <defs>
          <pattern id="grass" patternUnits="userSpaceOnUse" width="5" height="70">
            <rect width="5" height="70" fill="#16211A" />
            <rect x="0" width="2.5" height="70" fill="#1B2A21" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="70" fill="url(#grass)" />

        <g stroke="#3A443C" strokeWidth="0.2" fill="none">
          <rect x="0" y="0" width="100" height="70" />
          <line x1="50" y1="0" x2="50" y2="70" />
          <circle cx="50" cy="35" r="9" />
          <circle cx="50" cy="35" r="0.4" fill="#3A443C" />
          <rect x="0" y="17" width="14" height="36" />
          <rect x="86" y="17" width="14" height="36" />
          <rect x="0" y="25" width="5" height="20" />
          <rect x="95" y="25" width="5" height="20" />
          <circle cx="11" cy="35" r="0.6" fill="#3A443C" />
          <circle cx="89" cy="35" r="0.6" fill="#3A443C" />
          <rect x="0" y="32" width="2" height="6" />
          <rect x="98" y="32" width="2" height="6" />
        </g>

        {awayNodes && (
          <g>
            {awayNodes.map((p, i) => (
              <PlayerDot
                key={`a-${i}`}
                x={p.x}
                y={p.y}
                role={p.role}
                label={away!.players?.[i]?.name?.split(" ").slice(-1)[0]}
                primary={away!.primary}
                secondary={away!.secondary}
                active={highlightRole?.team === "away" && highlightRole.role === p.role}
              />
            ))}
          </g>
        )}

        <g>
          {homeNodes.map((p, i) => (
            <PlayerDot
              key={`h-${i}`}
              x={p.x}
              y={p.y}
              role={p.role}
              label={home.players?.[i]?.name?.split(" ").slice(-1)[0]}
              primary={home.primary}
              secondary={home.secondary}
              active={highlightRole?.team === "home" && highlightRole.role === p.role}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

function PlayerDot({
  x,
  y,
  role,
  label,
  primary,
  secondary,
  active,
}: {
  x: number;
  y: number;
  role: "GK" | "DF" | "MF" | "FW";
  label?: string;
  primary: string;
  secondary: string;
  active: boolean;
}) {
  const r = role === "GK" ? 1.6 : 1.3;
  return (
    <g transform={`translate(${x} ${y})`}>
      {active && (
        <circle r={r + 1.2} fill={primary} fillOpacity="0.15" className="pulse-dot" />
      )}
      <circle r={r} fill={primary} stroke={secondary} strokeWidth="0.25" />
      {label && (
        <text
          x="0"
          y={r + 2.4}
          textAnchor="middle"
          fontSize="2.2"
          fontFamily="JetBrains Mono, monospace"
          fill="#ECEFE6"
          fillOpacity="0.85"
        >
          {label}
        </text>
      )}
    </g>
  );
}
