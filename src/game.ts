export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

export type GamePhase = 'betting' | 'playing' | 'dealerTurn' | 'gameOver';

export type GameResult = 'win' | 'lose' | 'push' | 'blackjack' | 'bust' | null;

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1e293b',
  spades: '#1e293b',
};

const NUM_DECKS = 6;

export function createShoe(): Card[] {
  const shoe: Card[] = [];
  let idCounter = 0;
  for (let d = 0; d < NUM_DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ suit, rank, faceUp: true, id: `card-${idCounter++}` });
      }
    }
  }
  return shuffleDeck(shoe);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardValue(card: Card): number[] {
  if (card.rank === 'A') return [1, 11];
  if (['J', 'Q', 'K'].includes(card.rank)) return [10];
  return [parseInt(card.rank)];
}

export function handValue(cards: Card[]): number {
  const faceUpCards = cards.filter(c => c.faceUp);
  let total = 0;
  let aces = 0;

  for (const card of faceUpCards) {
    if (card.rank === 'A') {
      aces++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

export function fullHandValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && fullHandValue(cards) === 21;
}

export function isBust(cards: Card[]): boolean {
  return fullHandValue(cards) > 21;
}

export function isSoft17(cards: Card[]): boolean {
  const total = fullHandValue(cards);
  if (total !== 17) return false;
  // Check if hand contains an ace counted as 11
  let t = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; t += 11; }
    else if (['J','Q','K'].includes(c.rank)) t += 10;
    else t += parseInt(c.rank);
  }
  // If we didn't need to reduce any aces, one ace is 11 = soft
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return aces > 0; // at least one ace is still counted as 11
}

// Hi-Lo card counting
export function hiLoValue(card: Card): number {
  const val = cardValue(card)[0];
  if (val >= 2 && val <= 6) return 1;
  if (val >= 10 || card.rank === 'A') return -1;
  return 0;
}

export function calculateRunningCount(dealtCards: Card[]): number {
  return dealtCards.reduce((count, card) => count + hiLoValue(card), 0);
}

export function calculateTrueCount(runningCount: number, cardsRemaining: number): number {
  const decksRemaining = cardsRemaining / 52;
  if (decksRemaining <= 0) return 0;
  return Math.round((runningCount / decksRemaining) * 10) / 10;
}

export function determineResult(
  playerCards: Card[],
  dealerCards: Card[]
): GameResult {
  const pVal = fullHandValue(playerCards);
  const dVal = fullHandValue(dealerCards);
  const pBJ = isBlackjack(playerCards);
  const dBJ = isBlackjack(dealerCards);

  if (pBJ && dBJ) return 'push';
  if (pBJ) return 'blackjack';
  if (dBJ) return 'lose';
  if (pVal > 21) return 'bust';
  if (dVal > 21) return 'win';
  if (pVal > dVal) return 'win';
  if (pVal < dVal) return 'lose';
  return 'push';
}
