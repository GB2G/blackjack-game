import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Card, GamePhase, GameResult,
  createShoe, fullHandValue, handValue,
  isBlackjack, isBust, isSoft17,
  calculateRunningCount, calculateTrueCount,
  determineResult, SUIT_SYMBOLS, SUIT_COLORS,
} from './game';

// ─── Chip Component ───────────────────────────────────────────────
const CHIP_VALUES = [5, 10, 25, 50, 100] as const;
type ChipValue = typeof CHIP_VALUES[number];

const CHIP_STYLES: Record<ChipValue, { bg: string; border: string; text: string }> = {
  5:   { bg: 'bg-red-600',    border: 'border-red-400',    text: 'text-white' },
  10:  { bg: 'bg-blue-600',   border: 'border-blue-400',   text: 'text-white' },
  25:  { bg: 'bg-green-600',  border: 'border-green-400',  text: 'text-white' },
  50:  { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-white' },
  100: { bg: 'bg-gray-900',   border: 'border-yellow-400', text: 'text-yellow-300' },
};

function Chip({ value, onClick, disabled, selected }: {
  value: ChipValue;
  onClick: () => void;
  disabled: boolean;
  selected: boolean;
}) {
  const s = CHIP_STYLES[value];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-16 h-16 sm:w-18 sm:h-18 rounded-full ${s.bg} ${s.text} font-bold text-lg
        border-4 ${s.border} chip-shadow
        transition-all duration-200 cursor-pointer
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 hover:-translate-y-1 active:scale-95'}
        ${selected ? 'ring-4 ring-yellow-300 ring-offset-2 ring-offset-green-900 scale-110 -translate-y-1' : ''}
      `}
    >
      <div className="absolute inset-2 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
        ${value}
      </div>
    </button>
  );
}

// ─── Playing Card Component ──────────────────────────────────────
function PlayingCard({ card, index, animated = true }: {
  card: Card;
  index: number;
  animated?: boolean;
}) {
  const [dealt, setDealt] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const prevFaceUp = useRef(card.faceUp);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setDealt(true), index * 150);
      return () => clearTimeout(timer);
    } else {
      setDealt(true);
    }
  }, [animated, index]);

  useEffect(() => {
    if (prevFaceUp.current !== card.faceUp && card.faceUp) {
      setFlipped(true);
      const t = setTimeout(() => setFlipped(false), 600);
      prevFaceUp.current = card.faceUp;
      return () => clearTimeout(t);
    }
    prevFaceUp.current = card.faceUp;
  }, [card.faceUp]);

  if (!card.faceUp) {
    return (
      <div
        className={`
          relative w-20 h-28 sm:w-24 sm:h-34 rounded-xl card-shadow flex-shrink-0
          ${dealt ? 'deal-animation' : 'opacity-0'}
          ${flipped ? 'flip-animation' : ''}
        `}
        style={{ animationDelay: animated ? `${index * 150}ms` : '0ms' }}
      >
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 border-2 border-blue-600 flex items-center justify-center overflow-hidden">
          <div className="w-full h-full p-1.5">
            <div className="w-full h-full rounded-lg border border-blue-500/30 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.03)_3px,rgba(255,255,255,0.03)_6px)] flex items-center justify-center">
              <span className="text-3xl opacity-20">🂠</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={`
        relative w-20 h-28 sm:w-24 sm:h-34 rounded-xl card-shadow bg-white flex-shrink-0
        ${dealt ? 'deal-animation' : 'opacity-0'}
        ${flipped ? 'flip-animation' : ''}
      `}
      style={{ animationDelay: animated ? `${index * 150}ms` : '0ms' }}
    >
      <div className="w-full h-full rounded-xl border border-gray-200 p-1 sm:p-1.5 flex flex-col justify-between">
        <div className="flex flex-col items-start leading-none">
          <span className="text-sm sm:text-base font-bold" style={{ color }}>{card.rank}</span>
          <span className="text-xs sm:text-sm" style={{ color }}>{symbol}</span>
        </div>
        <div className="flex items-center justify-center flex-1">
          <span className="text-2xl sm:text-4xl" style={{ color }}>{symbol}</span>
        </div>
        <div className="flex flex-col items-end leading-none rotate-180">
          <span className="text-sm sm:text-base font-bold" style={{ color }}>{card.rank}</span>
          <span className="text-xs sm:text-sm" style={{ color }}>{symbol}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Hand Display ─────────────────────────────────────────────────
function Hand({ cards, label, value, isActive, animated }: {
  cards: Card[];
  label: string;
  value: number;
  isActive: boolean;
  animated: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-sm font-medium uppercase tracking-wider">{label}</span>
        {cards.length > 0 && (
          <span className={`
            px-3 py-0.5 rounded-full text-sm font-bold
            ${value > 21 ? 'bg-red-500/80 text-white' : 'bg-black/40 text-yellow-300'}
          `}>
            {value}
          </span>
        )}
      </div>
      <div className={`
        flex items-center gap-1 sm:gap-2 p-3 rounded-2xl min-h-36 sm:min-h-42
        ${isActive ? 'bg-white/10 pulse-glow rounded-2xl' : ''}
        transition-all duration-300
      `}>
        {cards.map((card, i) => (
          <div key={card.id} style={{ marginLeft: i > 0 ? '-20px' : '0' }}>
            <PlayingCard card={card} index={i} animated={animated} />
          </div>
        ))}
        {cards.length === 0 && (
          <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
            <span className="text-white/20 text-3xl">?</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result Badge ─────────────────────────────────────────────────
function ResultBadge({ result }: { result: GameResult }) {
  if (!result) return null;

  const config: Record<NonNullable<GameResult>, { text: string; color: string }> = {
    blackjack: { text: '🎰 BLACKJACK! 🎰', color: 'from-yellow-400 to-amber-600' },
    win:       { text: '🏆 YOU WIN!', color: 'from-green-400 to-emerald-600' },
    lose:      { text: '😞 DEALER WINS', color: 'from-red-400 to-red-600' },
    push:      { text: '🤝 PUSH', color: 'from-gray-400 to-gray-600' },
    bust:      { text: '💥 BUST!', color: 'from-red-500 to-red-700' },
  };

  const c = config[result];

  return (
    <div className="slide-up">
      <div className={`
        bg-gradient-to-r ${c.color} text-white font-black text-xl sm:text-2xl
        px-6 sm:px-10 py-3 sm:py-4 rounded-2xl shadow-2xl
        border-2 border-white/30
      `}>
        {c.text}
      </div>
    </div>
  );
}

// ─── Card Count Display ──────────────────────────────────────────
function CardCountDisplay({ runningCount, trueCount, cardsDealt, cardsRemaining, show }: {
  runningCount: number;
  trueCount: number;
  cardsDealt: number;
  cardsRemaining: number;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-xs sm:text-sm border border-white/10 z-10">
      <div className="text-yellow-400 font-bold mb-1 flex items-center gap-1">
        <span>🧮</span> Card Counter
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/80">
        <span>Running:</span>
        <span className={`font-bold ${runningCount > 0 ? 'text-green-400' : runningCount < 0 ? 'text-red-400' : 'text-white'}`}>
          {runningCount > 0 ? '+' : ''}{runningCount}
        </span>
        <span>True:</span>
        <span className={`font-bold ${trueCount > 0 ? 'text-green-400' : trueCount < 0 ? 'text-red-400' : 'text-white'}`}>
          {trueCount > 0 ? '+' : ''}{trueCount}
        </span>
        <span>Dealt:</span>
        <span className="font-mono">{cardsDealt}</span>
        <span>Remain:</span>
        <span className="font-mono">{cardsRemaining}</span>
      </div>
      <div className="mt-2 pt-1 border-t border-white/10 text-white/50 text-[10px]">
        {trueCount >= 2 ? '✅ Favorable — bet more!' :
         trueCount <= -2 ? '⚠️ Unfavorable — bet less' :
         '➡️ Neutral count'}
      </div>
    </div>
  );
}

// ─── Bet Display ──────────────────────────────────────────────────
function BetStack({ amount }: { amount: number }) {
  if (amount === 0) return null;
  const chips: ChipValue[] = [];
  let remaining = amount;
  for (const v of [100, 50, 25, 10, 5] as ChipValue[]) {
    while (remaining >= v) {
      chips.push(v);
      remaining -= v;
    }
  }

  return (
    <div className="flex items-center gap-1">
      {chips.slice(0, 6).map((v, i) => {
        const s = CHIP_STYLES[v];
        return (
          <div key={i} className={`w-8 h-8 rounded-full ${s.bg} border-2 ${s.border} flex items-center justify-center text-[10px] font-bold ${s.text} chip-shadow`}>
            {v}
          </div>
        );
      })}
      {chips.length > 6 && <span className="text-white/60 text-xs">+{chips.length - 6}</span>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
export function App() {
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [result, setResult] = useState<GameResult>(null);
  const [balance, setBalance] = useState(1000);
  const [currentBet, setCurrentBet] = useState(0);
  const [dealtCards, setDealtCards] = useState<Card[]>([]);
  const [showCount, setShowCount] = useState(true);
  const [message, setMessage] = useState('Place your bets!');
  const [animating, setAnimating] = useState(false);

  const shoeRef = useRef(shoe);
  shoeRef.current = shoe;

  // Reshuffle when shoe gets low
  useEffect(() => {
    if (shoe.length < 52 && phase === 'betting') {
      const newShoe = createShoe();
      setShoe(newShoe);
      setDealtCards([]);
      setMessage('🔄 Reshuffling shoe...');
      setTimeout(() => setMessage('Place your bets!'), 1500);
    }
  }, [shoe.length, phase]);

  const drawCard = useCallback((faceUp = true): Card => {
    const card = { ...shoeRef.current[0], faceUp };
    const newShoe = shoeRef.current.slice(1);
    shoeRef.current = newShoe;
    setShoe(newShoe);
    if (faceUp) {
      setDealtCards(prev => [...prev, card]);
    }
    return card;
  }, []);

  const placeBet = useCallback((amount: ChipValue) => {
    if (phase !== 'betting') return;
    if (balance >= amount) {
      setCurrentBet(prev => prev + amount);
      setBalance(prev => prev - amount);
    }
  }, [phase, balance]);

  const clearBet = useCallback(() => {
    if (phase !== 'betting') return;
    setBalance(prev => prev + currentBet);
    setCurrentBet(0);
  }, [phase, currentBet]);

  const deal = useCallback(() => {
    if (currentBet === 0 || phase !== 'betting') return;

    setAnimating(true);
    setResult(null);
    setMessage('Dealing...');

    const p1 = drawCard(true);
    const d1 = drawCard(true);
    const p2 = drawCard(true);
    const d2 = drawCard(false); // dealer hole card

    setPlayerCards([p1, p2]);
    setDealerCards([d1, d2]);

    setTimeout(() => {
      setAnimating(false);
      // Check for player blackjack
      if (isBlackjack([p1, p2])) {
        // Reveal dealer card
        const revealedD2 = { ...d2, faceUp: true };
        setDealerCards([d1, revealedD2]);
        setDealtCards(prev => [...prev, revealedD2]);

        if (isBlackjack([d1, revealedD2])) {
          setResult('push');
          setBalance(prev => prev + currentBet);
          setMessage('Both have Blackjack — Push!');
        } else {
          setResult('blackjack');
          setBalance(prev => prev + currentBet + Math.floor(currentBet * 1.5));
          setMessage('Blackjack pays 3:2!');
        }
        setPhase('gameOver');
      } else {
        setPhase('playing');
        setMessage('Hit or Stand?');
      }
    }, 900);
  }, [currentBet, phase, drawCard]);

  const hit = useCallback(() => {
    if (phase !== 'playing' || animating) return;
    setAnimating(true);

    const card = drawCard(true);
    const newHand = [...playerCards, card];
    setPlayerCards(newHand);

    setTimeout(() => {
      setAnimating(false);
      if (isBust(newHand)) {
        setResult('bust');
        setPhase('gameOver');
        setMessage('Bust! You went over 21.');
        // Reveal dealer card
        const revealed = dealerCards.map(c => ({ ...c, faceUp: true }));
        setDealerCards(revealed);
        revealed.filter(c => !dealtCards.find(d => d.id === c.id)).forEach(c => {
          setDealtCards(prev => [...prev, c]);
        });
      }
    }, 500);
  }, [phase, animating, drawCard, playerCards, dealerCards, dealtCards]);

  const stand = useCallback(() => {
    if (phase !== 'playing' || animating) return;
    setPhase('dealerTurn');
    setMessage('Dealer reveals...');

    // Reveal hole card
    const revealed = dealerCards.map(c => ({ ...c, faceUp: true }));
    setDealerCards(revealed);
    revealed.filter(c => !dealtCards.find(d => d.id === c.id)).forEach(c => {
      setDealtCards(prev => [...prev, c]);
    });

    // Dealer draws
    let dCards = [...revealed];
    const drawSequence: Card[] = [];

    while (fullHandValue(dCards) < 17 || (isSoft17(dCards) && fullHandValue(dCards) === 17)) {
      const card = drawCard(true);
      dCards = [...dCards, card];
      drawSequence.push(card);
    }

    // Animate dealer draws
    let delay = 800;
    drawSequence.forEach((card, i) => {
      setTimeout(() => {
        setDealerCards(prev => [...prev, card]);
      }, delay + i * 700);
    });

    setTimeout(() => {
      const res = determineResult(playerCards, dCards);
      setResult(res);
      setPhase('gameOver');

      if (res === 'win') {
        setBalance(prev => prev + currentBet * 2);
        setMessage('You win!');
      } else if (res === 'push') {
        setBalance(prev => prev + currentBet);
        setMessage('Push — bet returned.');
      } else {
        setMessage('Dealer wins.');
      }
    }, delay + drawSequence.length * 700 + 300);
  }, [phase, animating, dealerCards, dealtCards, drawCard, playerCards, currentBet]);

  const newRound = useCallback(() => {
    setPlayerCards([]);
    setDealerCards([]);
    setCurrentBet(0);
    setResult(null);
    setPhase('betting');
    setMessage('Place your bets!');
    setAnimating(false);
  }, []);

  const doubleDown = useCallback(() => {
    if (phase !== 'playing' || animating || playerCards.length !== 2) return;
    if (balance < currentBet) return;

    setBalance(prev => prev - currentBet);
    setCurrentBet(prev => prev * 2);
    setAnimating(true);

    const card = drawCard(true);
    const newHand = [...playerCards, card];
    setPlayerCards(newHand);

    setTimeout(() => {
      setAnimating(false);
      if (isBust(newHand)) {
        setResult('bust');
        setPhase('gameOver');
        setMessage('Bust! You went over 21.');
        const revealed = dealerCards.map(c => ({ ...c, faceUp: true }));
        setDealerCards(revealed);
        revealed.filter(c => !dealtCards.find(d => d.id === c.id)).forEach(c => {
          setDealtCards(prev => [...prev, c]);
        });
      } else {
        // Auto-stand after double down
        stand();
      }
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, animating, playerCards, balance, currentBet, drawCard, dealerCards, dealtCards]);

  const runningCount = calculateRunningCount(dealtCards);
  const trueCount = calculateTrueCount(runningCount, shoe.length);
  const playerValue = handValue(playerCards);
  const dealerValue = handValue(dealerCards);

  const canBet = phase === 'betting';
  const canPlay = phase === 'playing' && !animating;
  const isGameOver = phase === 'gameOver';

  return (
    <div className="w-full h-screen felt-bg flex flex-col relative overflow-hidden select-none">
      {/* Card count display */}
      <CardCountDisplay
        runningCount={runningCount}
        trueCount={trueCount}
        cardsDealt={dealtCards.length}
        cardsRemaining={shoe.length}
        show={showCount}
      />

      {/* Toggle count button */}
      <button
        onClick={() => setShowCount(v => !v)}
        className="absolute top-3 left-3 bg-black/40 hover:bg-black/60 text-white/70 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-all z-10 cursor-pointer"
      >
        {showCount ? '🙈 Hide Count' : '🧮 Show Count'}
      </button>

      {/* Balance display */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-xl px-5 py-2 text-center z-10 border border-yellow-600/30">
        <div className="text-yellow-400/70 text-[10px] uppercase tracking-widest">Balance</div>
        <div className="text-yellow-300 font-bold text-xl">${balance.toLocaleString()}</div>
      </div>

      {/* Shoe indicator */}
      <div className="absolute top-16 left-3 z-10">
        <div className="bg-black/40 rounded-lg px-2 py-1 text-[10px] text-white/50">
          Shoe: {Math.round((shoe.length / 312) * 100)}%
          <div className="w-16 h-1 bg-white/10 rounded-full mt-1">
            <div
              className="h-full bg-yellow-400/60 rounded-full transition-all duration-500"
              style={{ width: `${(shoe.length / 312) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game table */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 pt-14 pb-4 px-4">
        {/* Dealer area */}
        <Hand
          cards={dealerCards}
          label="Dealer"
          value={dealerValue}
          isActive={phase === 'dealerTurn'}
          animated={true}
        />

        {/* Result / Message */}
        <div className="h-16 flex items-center justify-center">
          {isGameOver && result ? (
            <ResultBadge result={result} />
          ) : (
            <div className="text-white/60 text-sm font-medium bg-black/20 px-4 py-2 rounded-full">
              {message}
            </div>
          )}
        </div>

        {/* Player area */}
        <Hand
          cards={playerCards}
          label="Your Hand"
          value={playerValue}
          isActive={phase === 'playing'}
          animated={true}
        />
      </div>

      {/* Current bet display */}
      {currentBet > 0 && (
        <div className="flex items-center justify-center gap-2 pb-2">
          <span className="text-white/50 text-xs">BET:</span>
          <span className="text-yellow-300 font-bold text-lg">${currentBet}</span>
          <BetStack amount={currentBet} />
        </div>
      )}

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/60 via-black/40 to-transparent px-4 pb-5 pt-3">
        {canBet && (
          <div className="flex flex-col items-center gap-3 slide-up">
            {/* Chips */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              {CHIP_VALUES.map(v => (
                <Chip
                  key={v}
                  value={v}
                  onClick={() => placeBet(v)}
                  disabled={balance < v}
                  selected={false}
                />
              ))}
            </div>
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={clearBet}
                disabled={currentBet === 0}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
              >
                Clear
              </button>
              <button
                onClick={deal}
                disabled={currentBet === 0}
                className="px-8 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-yellow-900/30 cursor-pointer text-lg"
              >
                DEAL
              </button>
            </div>
          </div>
        )}

        {canPlay && (
          <div className="flex items-center justify-center gap-3 slide-up">
            <button
              onClick={hit}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/30 transition-all cursor-pointer text-base sm:text-lg active:scale-95"
            >
              🃏 HIT
            </button>
            <button
              onClick={stand}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 transition-all cursor-pointer text-base sm:text-lg active:scale-95"
            >
              ✋ STAND
            </button>
            {playerCards.length === 2 && balance >= currentBet && (
              <button
                onClick={doubleDown}
                className="px-6 sm:px-8 py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all cursor-pointer text-base sm:text-lg active:scale-95"
              >
                ⬆️ DOUBLE
              </button>
            )}
          </div>
        )}

        {phase === 'dealerTurn' && (
          <div className="flex items-center justify-center">
            <div className="text-white/60 text-sm animate-pulse">Dealer is playing...</div>
          </div>
        )}

        {isGameOver && (
          <div className="flex flex-col items-center gap-3 slide-up">
            {balance === 0 && currentBet === 0 ? (
              <button
                onClick={() => { setBalance(1000); newRound(); }}
                className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg cursor-pointer text-lg"
              >
                🔄 REBUY $1,000
              </button>
            ) : (
              <button
                onClick={newRound}
                className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg cursor-pointer text-lg active:scale-95 transition-all"
              >
                NEW HAND
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
