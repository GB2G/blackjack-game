export interface GameDef {
  slug: string;
  title: string;
  desc: string;
  accent: string;
  gradient: string;
  glow: string;
  players: number;
  minBet: number;
}

export const GAMES: GameDef[] = [
  { slug: 'blackjack', title: 'Blackjack', desc: 'Beat the dealer to 21', accent: '#3b82f6', gradient: 'from-blue-600 to-blue-900', glow: 'shadow-blue-500/30', players: 2847, minBet: 5 },
  { slug: 'roulette', title: 'Roulette', desc: 'European single-zero wheel', accent: '#22c55e', gradient: 'from-green-600 to-green-900', glow: 'shadow-green-500/30', players: 1923, minBet: 1 },
  { slug: 'baccarat', title: 'Baccarat', desc: 'Punto Banco classic', accent: '#f59e0b', gradient: 'from-amber-600 to-amber-900', glow: 'shadow-amber-500/30', players: 1456, minBet: 10 },
  { slug: 'slots', title: 'Slots', desc: 'Spin to win big jackpots', accent: '#a855f7', gradient: 'from-purple-600 to-purple-900', glow: 'shadow-purple-500/30', players: 5102, minBet: 1 },
  { slug: 'craps', title: 'Craps', desc: 'Roll the dice, beat the house', accent: '#ef4444', gradient: 'from-red-600 to-red-900', glow: 'shadow-red-500/30', players: 987, minBet: 5 },
];

export const getGame = (slug: string) => GAMES.find(g => g.slug === slug);
