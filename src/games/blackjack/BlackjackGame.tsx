import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';

/* ── Card Types ── */
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface Card { rank: Rank; suit: Suit; }
interface Hand { cards: Card[]; bet: number; done: boolean; result?: string; payout?: number; doubled?: boolean; }
type Phase = 'betting' | 'playing' | 'dealerTurn' | 'resolved';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const NUM_DECKS = 6;

/* ── Pure Logic ── */
function createShoe(): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < NUM_DECKS; d++)
    for (const suit of SUITS)
      for (const rank of RANKS)
        shoe.push({ rank, suit });
  // Fisher-Yates
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function cardValue(c: Card): number {
  if (c.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(c.rank)) return 10;
  return parseInt(c.rank);
}

function handTotal(cards: Card[]): number {
  let total = cards.reduce((s, c) => s + cardValue(c), 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isSoft(cards: Card[]): boolean {
  let total = cards.reduce((s, c) => s + cardValue(c), 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return aces > 0 && total <= 21;
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards) === 21;
}

// FIXED: canSplit checks card VALUE not rank — so 10, J, Q, K can all split with each other
function canSplit(hand: Hand, numHands: number, balance: number): boolean {
  if (hand.cards.length !== 2 || numHands >= 4) return false;
  if (balance < hand.bet) return false;
  return cardValue(hand.cards[0]) === cardValue(hand.cards[1]);
}

function canDouble(hand: Hand, balance: number): boolean {
  return hand.cards.length === 2 && balance >= hand.bet;
}

const isRed = (s: Suit) => s === '♥' || s === '♦';

/* ── Card Component ── */
function CardComp({ card, hidden, index }: { card: Card; hidden?: boolean; index: number }) {
  return (
    <motion.div
      initial={{ x: 100, y: -80, opacity: 0, rotateY: hidden ? 180 : 0 }}
      animate={{ x: 0, y: 0, opacity: 1, rotateY: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4, ease: 'easeOut' as const }}
      className="relative w-16 h-22 sm:w-20 sm:h-28 flex-shrink-0"
    >
      {hidden ? (
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 border border-blue-600/30 shadow-lg flex items-center justify-center">
          <div className="w-10 h-16 rounded border border-blue-400/20 bg-blue-900/50" />
        </div>
      ) : (
        <div className="w-full h-full rounded-lg bg-white shadow-lg border border-white/20 flex flex-col items-center justify-center p-1">
          <span className={`text-lg sm:text-xl font-bold leading-none ${isRed(card.suit) ? 'text-red-600' : 'text-gray-900'}`}>
            {card.rank}
          </span>
          <span className={`text-xl sm:text-2xl leading-none ${isRed(card.suit) ? 'text-red-500' : 'text-gray-800'}`}>
            {card.suit}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Game ── */
export default function BlackjackGame() {
  const { balance, add, subtract } = useWallet();
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [betAmount, setBetAmount] = useState(0);
  const [hands, setHands] = useState<Hand[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>('betting');
  const [message, setMessage] = useState('Place your bet');
  const shoeRef = useRef(shoe);
  shoeRef.current = shoe;

  const draw = useCallback((): Card => {
    const s = [...shoeRef.current];
    if (s.length < 20) {
      const fresh = createShoe();
      const c = fresh.pop()!;
      shoeRef.current = fresh;
      setShoe(fresh);
      return c;
    }
    const c = s.pop()!;
    shoeRef.current = s;
    setShoe(s);
    return c;
  }, []);

  const addChip = (v: number) => {
    if (phase !== 'betting') return;
    if (betAmount + v > balance) return;
    setBetAmount(p => p + v);
  };

  const clearBet = () => setBetAmount(0);

  const deal = () => {
    if (betAmount < 5 || betAmount > balance) return;
    subtract(betAmount);
    const p1 = draw(), d1 = draw(), p2 = draw(), d2 = draw();
    const playerCards = [p1, p2];
    const dc = [d1, d2];
    setDealerCards(dc);
    const h: Hand = { cards: playerCards, bet: betAmount, done: false };

    // Check naturals
    if (isBlackjack(playerCards) && isBlackjack(dc)) {
      h.done = true; h.result = 'Push'; h.payout = betAmount;
      add(betAmount);
      setHands([h]); setPhase('resolved'); setMessage('Both Blackjack — Push!');
    } else if (isBlackjack(playerCards)) {
      const win = betAmount * 1.5;
      h.done = true; h.result = 'Blackjack!'; h.payout = betAmount + win;
      add(betAmount + win);
      setHands([h]); setPhase('resolved'); setMessage('Blackjack! 🎉');
    } else if (isBlackjack(dc)) {
      h.done = true; h.result = 'Dealer Blackjack'; h.payout = 0;
      setHands([h]); setPhase('resolved'); setMessage('Dealer Blackjack');
    } else {
      setHands([h]); setActiveIdx(0); setPhase('playing'); setMessage('Your turn');
    }
  };

  const hit = () => {
    if (phase !== 'playing') return;
    const nh = [...hands];
    const h = { ...nh[activeIdx], cards: [...nh[activeIdx].cards, draw()] };
    if (handTotal(h.cards) > 21) {
      h.done = true; h.result = 'Bust';
    }
    nh[activeIdx] = h;
    setHands(nh);
    if (h.done) advanceHand(nh, activeIdx);
  };

  const stand = () => {
    if (phase !== 'playing') return;
    const nh = [...hands];
    nh[activeIdx] = { ...nh[activeIdx], done: true };
    setHands(nh);
    advanceHand(nh, activeIdx);
  };

  const doubleDown = () => {
    if (phase !== 'playing' || !canDouble(hands[activeIdx], balance)) return;
    subtract(hands[activeIdx].bet);
    const nh = [...hands];
    const h = { ...nh[activeIdx], cards: [...nh[activeIdx].cards, draw()], bet: nh[activeIdx].bet * 2, done: true, doubled: true };
    if (handTotal(h.cards) > 21) h.result = 'Bust';
    nh[activeIdx] = h;
    setHands(nh);
    advanceHand(nh, activeIdx);
  };

  const split = () => {
    if (phase !== 'playing' || !canSplit(hands[activeIdx], hands.length, balance)) return;
    subtract(hands[activeIdx].bet);
    const nh = [...hands];
    const orig = nh[activeIdx];
    const h1: Hand = { cards: [orig.cards[0], draw()], bet: orig.bet, done: false };
    const h2: Hand = { cards: [orig.cards[1], draw()], bet: orig.bet, done: false };
    // Split aces: one card each, auto stand
    if (orig.cards[0].rank === 'A') {
      h1.done = true; h2.done = true;
    }
    nh.splice(activeIdx, 1, h1, h2);
    setHands(nh);
    if (h1.done && h2.done) {
      startDealerTurn(nh);
    }
  };

  const advanceHand = (nh: Hand[], idx: number) => {
    const next = nh.findIndex((h, i) => i > idx && !h.done);
    if (next >= 0) {
      setActiveIdx(next);
      setMessage(`Hand ${next + 1}`);
    } else {
      startDealerTurn(nh);
    }
  };

  const startDealerTurn = (nh: Hand[]) => {
    // If all hands busted, resolve immediately
    const allBusted = nh.every(h => h.result === 'Bust');
    if (allBusted) {
      resolve(nh, dealerCards);
      return;
    }
    setPhase('dealerTurn');
    setMessage('Dealer reveals...');
    dealerPlay(nh, [...dealerCards]);
  };

  const dealerPlay = (nh: Hand[], dc: Card[]) => {
    const step = () => {
      if (handTotal(dc) < 17 || (handTotal(dc) === 17 && isSoft(dc))) {
        dc.push(draw());
        setDealerCards([...dc]);
        setTimeout(step, 600);
      } else {
        resolve(nh, dc);
      }
    };
    setTimeout(step, 600);
  };

  const resolve = (nh: Hand[], dc: Card[]) => {
    const dt = handTotal(dc);
    const dealerBust = dt > 21;
    const resolved = nh.map(h => {
      if (h.result === 'Bust') return { ...h, payout: 0 };
      const pt = handTotal(h.cards);
      let result: string;
      let payout: number;
      if (dealerBust || pt > dt) {
        result = 'Win!'; payout = h.bet * 2;
      } else if (pt === dt) {
        result = 'Push'; payout = h.bet;
      } else {
        result = 'Lose'; payout = 0;
      }
      if (payout > 0) add(payout);
      return { ...h, done: true, result, payout };
    });
    setHands(resolved);
    setPhase('resolved');
    const totalWon = resolved.reduce((s, h) => s + (h.payout || 0), 0);
    const totalBet = resolved.reduce((s, h) => s + h.bet, 0);
    if (totalWon > totalBet) setMessage(`You won $${(totalWon - totalBet).toFixed(2)}! 🎉`);
    else if (totalWon === totalBet) setMessage('Push — Bet returned');
    else setMessage(`Lost $${(totalBet - totalWon).toFixed(2)}`);
  };

  const newRound = () => {
    setHands([]); setDealerCards([]); setPhase('betting'); setBetAmount(0); setActiveIdx(0); setMessage('Place your bet');
  };

  // Auto-advance for split aces
  useEffect(() => {
    if (phase === 'playing' && hands.length > 0 && hands[activeIdx]?.done) {
      const next = hands.findIndex((h, i) => i > activeIdx && !h.done);
      if (next >= 0) { setActiveIdx(next); }
      else if (hands.every(h => h.done)) { startDealerTurn(hands); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hands, activeIdx, phase]);

  const chips = [5, 10, 25, 100, 500];
  const activeHand = hands[activeIdx];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl sm:text-4xl font-black text-blue-400 mb-6">
        ♠ Blackjack
      </motion.h1>

      {/* Message Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="glass rounded-xl px-6 py-2 mb-6 text-center"
        >
          <span className="text-lg font-semibold text-white/90">{message}</span>
        </motion.div>
      </AnimatePresence>

      {/* Table */}
      <div className="w-full max-w-3xl glass-strong rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-green-950/30 rounded-3xl" />
        <div className="relative z-10">
          {/* Dealer */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white/50 text-sm font-semibold uppercase tracking-wider">Dealer</span>
              {dealerCards.length > 0 && (
                <span className="text-amber-400 font-bold">
                  {phase === 'resolved' || phase === 'dealerTurn' ? handTotal(dealerCards) : cardValue(dealerCards[0])}
                </span>
              )}
            </div>
            <div className="flex gap-2 min-h-[7rem] items-end flex-wrap">
              {dealerCards.map((c, i) => (
                <CardComp key={`d${i}`} card={c} hidden={i === 1 && phase === 'playing'} index={i} />
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 my-4" />

          {/* Player Hands */}
          <div className="space-y-4">
            {hands.length === 0 && (
              <div className="min-h-[7rem] flex items-center justify-center text-white/20 text-sm">
                Cards will appear here
              </div>
            )}
            {hands.map((h, hi) => (
              <div key={hi} className={`p-3 rounded-xl transition-all ${hi === activeIdx && phase === 'playing' ? 'ring-2 ring-blue-400/50 bg-blue-400/5' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white/50 text-sm font-semibold">
                    {hands.length > 1 ? `Hand ${hi + 1}` : 'You'}
                  </span>
                  <span className="text-blue-400 font-bold">{handTotal(h.cards)}</span>
                  <span className="text-white/30 text-xs ml-auto">${h.bet}{h.doubled ? ' (doubled)' : ''}</span>
                  {h.result && (
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${h.result === 'Win!' || h.result === 'Blackjack!' ? 'text-green-400 bg-green-400/10' : h.result === 'Push' ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'}`}>
                      {h.result}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {h.cards.map((c, ci) => (
                    <CardComp key={`p${hi}-${ci}`} card={c} index={ci} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-3xl mt-6 space-y-4">
        {phase === 'betting' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {chips.map(v => (
                <motion.button
                  key={v}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => addChip(v)}
                  disabled={betAmount + v > balance}
                  className="w-14 h-14 rounded-full font-bold text-sm border-2 border-amber-400/40 bg-gradient-to-br from-amber-900/40 to-amber-950/60 text-amber-300 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ${v}
                </motion.button>
              ))}
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-amber-400">${betAmount}</span>
              {betAmount > 0 && (
                <button onClick={clearBet} className="ml-3 text-xs text-white/40 hover:text-white/70 underline">Clear</button>
              )}
            </div>
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={deal}
                disabled={betAmount < 5}
                className="px-10 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/25 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-blue-500/40 transition-shadow"
              >
                Deal
              </motion.button>
            </div>
          </motion.div>
        )}

        {phase === 'playing' && activeHand && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-3 flex-wrap">
            <motion.button whileTap={{ scale: 0.9 }} onClick={hit}
              className="px-6 py-3 rounded-xl glass font-bold text-white hover:bg-white/10 transition-colors">Hit</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={stand}
              className="px-6 py-3 rounded-xl glass font-bold text-white hover:bg-white/10 transition-colors">Stand</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={doubleDown}
              disabled={!canDouble(activeHand, balance)}
              className="px-6 py-3 rounded-xl glass font-bold text-amber-400 hover:bg-amber-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Double
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={split}
              disabled={!canSplit(activeHand, hands.length, balance)}
              className="px-6 py-3 rounded-xl glass font-bold text-purple-400 hover:bg-purple-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Split
            </motion.button>
          </motion.div>
        )}

        {phase === 'dealerTurn' && (
          <div className="text-center text-white/50 animate-pulse">Dealer is playing...</div>
        )}

        {phase === 'resolved' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={newRound}
              className="px-10 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
            >
              New Hand
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
