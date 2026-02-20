export interface GameDef {
  slug: string;
  title: string;
  description: string;
  accent: string;
  gradient: string;
  glow: string;
  players: number;
  minBet: number;
  maxBet: number;
}

export const GAMES: GameDef[] = [
  { slug: "blackjack", title: "Blackjack", description: "Beat the dealer to 21", accent: "#3b82f6", gradient: "from-blue-600 to-blue-900", glow: "shadow-blue-500/30", players: 1842, minBet: 5, maxBet: 10000 },
  { slug: "roulette", title: "Roulette", description: "European single-zero wheel", accent: "#10b981", gradient: "from-emerald-600 to-emerald-900", glow: "shadow-emerald-500/30", players: 2103, minBet: 1, maxBet: 5000 },
  { slug: "baccarat", title: "Baccarat", description: "Punto Banco — classic elegance", accent: "#f59e0b", gradient: "from-amber-600 to-amber-900", glow: "shadow-amber-500/30", players: 956, minBet: 10, maxBet: 25000 },
  { slug: "slots", title: "Slots", description: "5-reel video slots with free spins", accent: "#a855f7", gradient: "from-purple-600 to-purple-900", glow: "shadow-purple-500/30", players: 4521, minBet: 1, maxBet: 500 },
  { slug: "craps", title: "Craps", description: "Roll the dice — feel the rush", accent: "#ef4444", gradient: "from-red-600 to-red-900", glow: "shadow-red-500/30", players: 723, minBet: 5, maxBet: 10000 },
];

export function getGame(slug: string): GameDef | undefined {
  return GAMES.find(g => g.slug === slug);
}
