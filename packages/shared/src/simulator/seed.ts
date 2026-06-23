export function seedFromMatchId(matchId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < matchId.length; i++) {
    hash ^= matchId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
