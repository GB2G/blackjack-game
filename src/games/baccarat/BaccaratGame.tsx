import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface Card { rank: Rank; suit: Suit; }
type BetSide = 'player' | 'banker' | 'tie';
type Phase = 'betting' | 'dealing' | 'resolved';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const NUM_DECKS = 8;

function createShoe(): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < NUM_DECKS; d++)
    for (const s of SUITS)
      for (const r of RANKS)
        shoe.push({ rank: r, suit: s });
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function bacVal(c: Card): number {
  if (c.rank === 'A') return 1;
  if (['10', 'J', 'Q', 'K'].includes(c.rank)) return 0;
  return parseInt(c.rank);
}

function handTotal(cards: Card[]): number {
  return cards.reduce((s, c) => s + bacVal(c), 0) % 10;
}

function isNatural(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards) >= 8;
}

function playerDrawsThird(playerCards: Card[]): boolean {
  return handTotal(playerCards) <= 5;
}

function bankerDrawsThird(bankerCards: Card[], playerThird: Card | null): boolean {
  const bt = handTotal(bankerCards);
  if (bt <= 2) return true;
  if (playerThird === null) return bt <= 5; // Player stood
  const p3 = bacVal(playerThird);
  if (bt === 3) return p3 !== 8;
  if (bt === 4) return p3 >= 2 && p3 <= 7;
  if (bt === 5) return p3 >= 4 && p3 <= 7;
  if (bt === 6) return p3 === 6 || p3 === 7;
  return false; // bt === 7
}

const isRed = (s: Suit) => s === '♥' || s === '♦';

function BacCard({ card, index }: { card: Card; index: number }) {
  return (
    <motion.div
      initial={{ x: 80, y: -50, opacity: 0, rotateY: 90 }}
      animate={{ x: 0, y: 0, opacity: 1, rotateY: 0 }}
      transition={{ delay: index * 0.3, duration: 0.5, ease: 'easeOut' as const }}
      className="w-16 h-22 sm:w-20 sm:h-28 rounded-lg bg-white shadow-lg flex flex-col items-center justify-center flex-shrink-0"
    >
      <span className={`text-lg sm:text-xl font-bold ${isRed(card.suit) ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</span>
      <span className={`text-xl sm:text-2xl ${isRed(card.suit) ? 'text-red-500' : 'text-gray-800'}`}>{card.suit}</span>
    </motion.div>
  );
}

export default function BaccaratGame() {
  const { balance, add, subtract } = useWallet();
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [betSide, setBetSide] = useState<BetSide | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>('betting');
  const [result, setResult] = useState('');
  const [payout, setPayout] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const shoeRef = useRef(shoe);
  shoeRef.current = shoe;

  const draw = useCallback((): Card => {
    let s = [...shoeRef.current];
    if (s.length < 20) s = createShoe();
    const c = s.pop()!;
    shoeRef.current = s;
    setShoe(s);
    return c;
  }, []);

  const addChip = (v: number) => {
    if (phase !== 'betting' || !betSide) return;
    if (betAmount + v > balance) return;
    setBetAmount(p => p + v);
  };

  const deal = () => {
    if (!betSide || betAmount < 5) return;
    if (!subtract(betAmount)) return;
    setPhase('dealing');

    const pc = [draw(), draw()];
    const bc = [draw(), draw()];

    // Check naturals
    if (isNatural(pc) || isNatural(bc)) {
      setPlayerCards(pc);
      setBankerCards(bc);
      setTimeout(() => resolveRound(pc, bc), 1500);
      return;
    }

    // Third card logic
    let playerThird: Card | null = null;
    if (playerDrawsThird(pc)) {
      playerThird = draw();
      pc.push(playerThird);
    }
    if (bankerDrawsThird(bc, playerThird)) {
      bc.push(draw());
    }

    setPlayerCards(pc);
    setBankerCards(bc);
    setTimeout(() => resolveRound(pc, bc), pc.length * 300 + bc.length * 300 + 1000);
  };

  const resolveRound = (pc: Card[], bc: Card[]) => {
    const pt = handTotal(pc);
    const bt = handTotal(bc);
    let winner: string;
    let pay = 0;

    if (pt > bt) winner = 'player';
    else if (bt > pt) winner = 'banker';
    else winner = 'tie';

    if (betSide === 'player' && winner === 'player') {
      pay = betAmount * 2;
    } else if (betSide === 'banker' && winner === 'banker') {
      pay = betAmount + betAmount * 0.95; // 5% commission
    } else if (betSide === 'tie' && winner === 'tie') {
      pay = betAmount * 9; // 8:1 + return bet
    } else if (winner === 'tie' && (betSide === 'player' || betSide === 'banker')) {
      pay = betAmount; // Push on tie for P/B bets
    }

    if (pay > 0) add(pay);
    setPayout(pay);
    setResult(
      winner === 'player' ? `Player wins! (${pt} vs ${bt})` :
      winner === 'banker' ? `Banker wins! (${bt} vs ${pt})` :
      `Tie! (${pt})`
    );
    setHistory(h => [winner === 'player' ? 'P' : winner === 'banker' ? 'B' : 'T', ...h.slice(0, 19)]);
    setPhase('resolved');
  };

  const newRound = () => {
    setPlayerCards([]); setBankerCards([]); setBetSide(null); setBetAmount(0);
    setResult(''); setPayout(0); setPhase('betting');
  };

  const chips = [5, 10, 25, 100, 500];
  const shoePercent = Math.round((shoe.length / (NUM_DECKS * 52)) * 100);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl sm:text-4xl font-black text-amber-400 mb-2">
        ♦ Baccarat
      </motion.h1>
      <div className="text-white/30 text-xs mb-6">Shoe: {shoePercent}% remaining</div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="mb-4 glass-strong rounded-2xl px-6 py-3 text-center">
            <div className="text-xl font-bold text-white">{result}</div>
            <div className={`font-bold ${payout > betAmount ? 'text-green-400' : payout === betAmount ? 'text-amber-400' : 'text-red-400'}`}>
              {payout > 0 ? `+$${payout.toFixed(2)}` : 'Lost'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="flex gap-1.5 mb-6 flex-wrap justify-center">
          {history.map((h, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${h === 'P' ? 'bg-blue-500' : h === 'B' ? 'bg-red-500' : 'bg-green-500'}`}>
              {h}
            </motion.div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="w-full max-w-4xl glass-strong rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-amber-950/20 rounded-3xl" />
        <div className="relative z-10 grid grid-cols-2 gap-8">
          {/* Player Hand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-400 font-bold uppercase tracking-wider text-sm">Player</span>
              {playerCards.length > 0 && (
                <span className="text-white font-black text-xl">{handTotal(playerCards)}</span>
              )}
            </div>
            <div className="flex gap-2 min-h-[7rem] items-end flex-wrap">
              {playerCards.map((c, i) => <BacCard key={i} card={c} index={i} />)}
              {playerCards.length === 0 && <div className="text-white/10 text-sm">—</div>}
            </div>
          </div>
          {/* Banker Hand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-400 font-bold uppercase tracking-wider text-sm">Banker</span>
              {bankerCards.length > 0 && (
                <span className="text-white font-black text-xl">{handTotal(bankerCards)}</span>
              )}
            </div>
            <div className="flex gap-2 min-h-[7rem] items-end flex-wrap">
              {bankerCards.map((c, i) => <BacCard key={i} card={c} index={i + playerCards.length} />)}
              {bankerCards.length === 0 && <div className="text-white/10 text-sm">—</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg space-y-4">
        {phase === 'betting' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Bet Side Selection */}
            <div className="grid grid-cols-3 gap-3">
              {([['player', 'Player', '1:1', 'from-blue-500 to-blue-700', 'blue'],
                 ['banker', 'Banker', '0.95:1', 'from-red-500 to-red-700', 'red'],
                 ['tie', 'Tie', '8:1', 'from-green-500 to-green-700', 'green']] as const).map(([side, label, odds, grad, col]) => (
                <motion.button key={side} whileTap={{ scale: 0.95 }}
                  onClick={() => { setBetSide(side); if (betAmount === 0) setBetAmount(0); }}
                  className={`py-4 rounded-xl font-bold text-center transition-all ${betSide === side ? `bg-gradient-to-br ${grad} text-white shadow-lg shadow-${col}-500/25` : 'glass text-white/60 hover:text-white/80'}`}>
                  <div className="text-lg">{label}</div>
                  <div className="text-xs opacity-70">{odds}</div>
                </motion.button>
              ))}
            </div>

            {/* Chips */}
            {betSide && (
              <>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {chips.map(v => (
                    <motion.button key={v} whileTap={{ scale: 0.9 }}
                      onClick={() => addChip(v)}
                      disabled={betAmount + v > balance}
                      className="w-14 h-14 rounded-full font-bold text-sm border-2 border-amber-400/30 bg-amber-900/30 text-amber-300 hover:border-amber-400 disabled:opacity-30 transition-all">
                      ${v}
                    </motion.button>
                  ))}
                  <button onClick={() => setBetAmount(0)} className="text-xs text-white/40 hover:text-white/70 ml-2">Clear</button>
                </div>
                <div className="text-center text-2xl font-bold text-amber-400">${betAmount}</div>
                <div className="flex justify-center">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={deal} disabled={betAmount < 5}
                    className="px-10 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 text-black font-bold text-lg shadow-lg shadow-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-shadow">
                    Deal
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {phase === 'dealing' && (
          <div className="text-center text-white/50 animate-pulse text-lg">Dealing cards...</div>
        )}

        {phase === 'resolved' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={newRound}
              className="px-10 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 text-black font-bold text-lg shadow-lg shadow-amber-500/25 transition-shadow">
              New Round
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
