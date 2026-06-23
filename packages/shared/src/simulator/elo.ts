export function updateElo(
  homeRating: number,
  awayRating: number,
  homeGoals: number,
  awayGoals: number,
  kFactor = 32,
): { newHome: number; newAway: number } {
  const expectedHome = 1 / (1 + 10 ** ((awayRating - homeRating) / 400));
  const expectedAway = 1 - expectedHome;

  const actualHome = homeGoals > awayGoals ? 1 : homeGoals < awayGoals ? 0 : 0.5;
  const actualAway = 1 - actualHome;

  const margin = Math.abs(homeGoals - awayGoals);
  const marginMultiplier = margin >= 2 ? 1.5 : 1;

  const k = kFactor * marginMultiplier;

  return {
    newHome: Math.round(homeRating + k * (actualHome - expectedHome)),
    newAway: Math.round(awayRating + k * (actualAway - expectedAway)),
  };
}
