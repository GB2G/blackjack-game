import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "../../context/WalletContext";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K";
interface Card { rank: Rank; suit: Suit; }
type Phase = "betting" | "playing" | "dealerTurn" | "done";
interface Hand { cards: Card[]; bet: number; done: boolean; result: string; doubled: boolean; }

const SUITS: Suit[] = ["♠","♥","♦","♣"];
const RANKS: Rank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const NUM_DECKS = 6;

function createShoe(): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < NUM_DECKS; d++) for (const s of SUITS) for (const r of RANKS) cards.push({ rank: r, suit: s });
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
}

function cardVal(c: Card): number { if (c.rank === "A") return 11; if (["K","Q","J"].includes(c.rank)) return 10; return parseInt(c.rank); }
function handVal(cards: Card[]): number {
  let t = 0, aces = 0;
  for (const c of cards) { t += cardVal(c); if (c.rank === "A") aces++; }
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return t;
}
function isBJ(cards: Card[]): boolean { return cards.length === 2 && handVal(cards) === 21; }
function isRed(s: Suit): boolean { return s === "♥" || s === "♦"; }

function CardComp({ card, hidden, i }: { card: Card; hidden?: boolean; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotateY: 180 }} animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: i * 0.15, duration: 0.4, type: "spring" }}
      className="relative w-16 h-22 sm:w-20 sm:h-28 rounded-xl border border-white/20 flex flex-col items-center justify-center text-lg font-bold flex-shrink-0"
      style={{ background: hidden ? "linear-gradient(135deg, #1e3a5f, #0f2744)" : "linear-gradient(135deg, #1a1a2e, #16213e)" }}
    >
      {hidden ? (
        <div className="text-2xl text-blue-400/30">?</div>
      ) : (
        <>
          <span className={isRed(card.suit) ? "text-red-400" : "text-gray-200"}>{card.rank}</span>
          <span className={`text-xl ${isRed(card.suit) ? "text-red-400" : "text-gray-300"}`}>{card.suit}</span>
        </>
      )}
    </motion.div>
  );
}

export default function BlackjackGame() {
  const wallet = useWallet();
  const [shoe, setShoe] = useState<Card[]>(createShoe);
  const [phase, setPhase] = useState<Phase>("betting");
  const [betAmt, setBetAmt] = useState(25);
  const [hands, setHands] = useState<Hand[]>([]);
  const [activeH, setActiveH] = useState(0);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [msg, setMsg] = useState("");
  const [hideHole, setHideHole] = useState(true);

  const draw = useCallback((): Card => {
    let s = shoe;
    if (s.length < 20) { s = createShoe(); setShoe(s); }
    const c = s[s.length - 1];
    setShoe(s.slice(0, -1));
    return c;
  }, [shoe]);

  function deal() {
    if (betAmt > wallet.balance) return;
    wallet.subtract(betAmt);
    const s = shoe.length < 20 ? createShoe() : [...shoe];
    const pc = [s.pop()!, s.pop()!];
    const dc = [s.pop()!, s.pop()!];
    setShoe(s);
    setDealer(dc);
    setHands([{ cards: pc, bet: betAmt, done: false, result: "", doubled: false }]);
    setActiveH(0);
    setHideHole(true);
    setMsg("");

    if (isBJ(pc) && isBJ(dc)) {
      setHideHole(false);
      setMsg("Both Blackjack — Push!");
      wallet.add(betAmt);
      setHands([{ cards: pc, bet: betAmt, done: true, result: "push", doubled: false }]);
      setPhase("done");
    } else if (isBJ(pc)) {
      setHideHole(false);
      const win = betAmt * 2.5;
      wallet.add(win);
      setMsg(`Blackjack! Won $${(win - betAmt).toFixed(2)}`);
      setHands([{ cards: pc, bet: betAmt, done: true, result: "blackjack", doubled: false }]);
      setPhase("done");
    } else if (isBJ(dc)) {
      setHideHole(false);
      setMsg("Dealer Blackjack!");
      setHands([{ cards: pc, bet: betAmt, done: true, result: "lose", doubled: false }]);
      setPhase("done");
    } else {
      setPhase("playing");
    }
  }

  function hit() {
    const h = [...hands];
    const c = draw();
    h[activeH] = { ...h[activeH], cards: [...h[activeH].cards, c] };
    if (handVal(h[activeH].cards) >= 21) {
      h[activeH].done = true;
      h[activeH].result = handVal(h[activeH].cards) > 21 ? "bust" : "";
    }
    setHands(h);
    if (h[activeH].done) advanceHand(h, activeH);
  }

  function stand() {
    const h = [...hands];
    h[activeH] = { ...h[activeH], done: true };
    setHands(h);
    advanceHand(h, activeH);
  }

  function doubleDown() {
    if (hands[activeH].bet > wallet.balance) return;
    wallet.subtract(hands[activeH].bet);
    const h = [...hands];
    const c = draw();
    h[activeH] = { ...h[activeH], cards: [...h[activeH].cards, c], bet: h[activeH].bet * 2, done: true, doubled: true };
    if (handVal(h[activeH].cards) > 21) h[activeH].result = "bust";
    setHands(h);
    advanceHand(h, activeH);
  }

  function split() {
    const hand = hands[activeH];
    if (hand.cards.length !== 2 || cardVal(hand.cards[0]) !== cardVal(hand.cards[1])) return;
    if (hand.bet > wallet.balance) return;
    wallet.subtract(hand.bet);
    const h = [...hands];
    const c1 = draw(), c2 = draw();
    h.splice(activeH, 1,
      { cards: [hand.cards[0], c1], bet: hand.bet, done: false, result: "", doubled: false },
      { cards: [hand.cards[1], c2], bet: hand.bet, done: false, result: "", doubled: false }
    );
    setHands(h);
  }

  function advanceHand(h: Hand[], idx: number) {
    const next = h.findIndex((hh, i) => i > idx && !hh.done);
    if (next >= 0) { setActiveH(next); return; }
    const allBust = h.every(hh => hh.result === "bust");
    if (allBust) { setMsg("Busted!"); setPhase("done"); setHideHole(false); return; }
    runDealer(h);
  }

  function runDealer(playerHands: Hand[]) {
    setHideHole(false);
    setPhase("dealerTurn");
    let dc = [...dealer];
    const s = [...shoe];
    while (handVal(dc) < 17) { dc.push(s.pop()!); }
    setShoe(s);
    setDealer(dc);
    const dv = handVal(dc);
    const dBust = dv > 21;
    const h = playerHands.map(hand => {
      if (hand.result === "bust") return hand;
      const pv = handVal(hand.cards);
      let result: string;
      if (dBust || pv > dv) result = "win";
      else if (pv < dv) result = "lose";
      else result = "push";
      if (result === "win") wallet.add(hand.bet * 2);
      else if (result === "push") wallet.add(hand.bet);
      return { ...hand, done: true, result };
    });
    setHands(h);
    const wins = h.filter(hh => hh.result === "win").length;
    const pushes = h.filter(hh => hh.result === "push").length;
    if (dBust) setMsg(`Dealer busts with ${dv}! ${wins} win(s)`);
    else if (wins > 0) setMsg(`You win ${wins} hand(s)!`);
    else if (pushes > 0) setMsg("Push");
    else setMsg("Dealer wins");
    setPhase("done");
  }

  function newRound() {
    setPhase("betting");
    setHands([]);
    setDealer([]);
    setMsg("");
    setHideHole(true);
  }

  const canSplit = phase === "playing" && hands[activeH] && hands[activeH].cards.length === 2 && cardVal(hands[activeH].cards[0]) === cardVal(hands[activeH].cards[1]) && hands.length < 4;
  const canDouble = phase === "playing" && hands[activeH] && hands[activeH].cards.length === 2 && hands[activeH].bet <= wallet.balance;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">BLACKJACK</h1>
      </motion.div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 p-4 sm:p-6 mb-6" style={{ background: "linear-gradient(135deg, #0a2e1a, #0d3320, #0a2e1a)" }}>
        {/* Dealer */}
        <div className="mb-8">
          <div className="text-sm text-gray-400 mb-2">Dealer {!hideHole && dealer.length > 0 ? `— ${handVal(dealer)}` : ""}</div>
          <div className="flex gap-2 min-h-[7rem] flex-wrap">
            {dealer.map((c, i) => <CardComp key={i} card={c} hidden={i === 1 && hideHole} i={i} />)}
          </div>
        </div>

        {/* Message */}
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-3 mb-6 rounded-xl bg-black/40 border border-amber-500/30 text-amber-400 font-bold text-lg">{msg}</motion.div>
          )}
        </AnimatePresence>

        {/* Player Hands */}
        <div className="space-y-4">
          {hands.map((hand, hi) => (
            <div key={hi} className={`p-3 rounded-xl border ${hi === activeH && phase === "playing" ? "border-blue-400/50 bg-blue-500/5" : "border-white/5"}`}>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <span>Hand {hands.length > 1 ? hi + 1 : ""} — {handVal(hand.cards)}</span>
                <span className="text-amber-400">${hand.bet}</span>
                {hand.result && <span className={`ml-auto font-bold ${hand.result === "win" || hand.result === "blackjack" ? "text-green-400" : hand.result === "push" ? "text-yellow-400" : "text-red-400"}`}>
                  {hand.result.toUpperCase()}
                </span>}
              </div>
              <div className="flex gap-2 flex-wrap">{hand.cards.map((c, i) => <CardComp key={i} card={c} i={i} />)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      {phase === "betting" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-2">
            {[5, 10, 25, 50, 100, 500].map(v => (
              <button key={v} onClick={() => setBetAmt(v)}
                className={`w-14 h-14 rounded-full font-bold text-sm border-2 transition-all ${betAmt === v ? "border-amber-400 bg-amber-500/20 text-amber-400 scale-110" : "border-white/20 bg-white/5 text-gray-300 hover:border-white/40"}`}>
                ${v}
              </button>
            ))}
          </div>
          <button onClick={deal} disabled={betAmt > wallet.balance}
            className="px-10 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
            Deal — ${betAmt}
          </button>
        </motion.div>
      )}

      {phase === "playing" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap justify-center gap-3">
          <button onClick={hit} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold transition-all active:scale-95">Hit</button>
          <button onClick={stand} className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold transition-all active:scale-95">Stand</button>
          {canDouble && <button onClick={doubleDown} className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold transition-all active:scale-95">Double</button>}
          {canSplit && <button onClick={split} className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition-all active:scale-95">Split</button>}
        </motion.div>
      )}

      {phase === "done" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <button onClick={newRound} className="px-10 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-lg hover:brightness-110 transition-all active:scale-95">
            New Round
          </button>
        </motion.div>
      )}
    </div>
  );
}
