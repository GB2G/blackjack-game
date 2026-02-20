import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "../../context/WalletContext";

type Suit = "♠"|"♥"|"♦"|"♣";
type Rank = "A"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K";
interface Card { rank: Rank; suit: Suit; }
type BetSide = "player" | "banker" | "tie";
type Phase = "betting" | "dealing" | "done";

const SUITS: Suit[] = ["♠","♥","♦","♣"];
const RANKS: Rank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const NUM_DECKS = 8;

function createShoe(): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < NUM_DECKS; d++) for (const s of SUITS) for (const r of RANKS) cards.push({ rank: r, suit: s });
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
}

function cardVal(c: Card): number {
  if (c.rank === "A") return 1;
  if (["10","J","Q","K"].includes(c.rank)) return 0;
  return parseInt(c.rank);
}

function handTotal(cards: Card[]): number {
  return cards.reduce((s, c) => s + cardVal(c), 0) % 10;
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
  if (!playerThird) return bt <= 5; // player stood
  const p3 = cardVal(playerThird);
  if (bt === 3) return p3 !== 8;
  if (bt === 4) return p3 >= 2 && p3 <= 7;
  if (bt === 5) return p3 >= 4 && p3 <= 7;
  if (bt === 6) return p3 === 6 || p3 === 7;
  return false; // 7: stand
}

function isRed(s: Suit): boolean { return s === "♥" || s === "♦"; }

function BCard({ card, i }: { card: Card; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -30, rotateY: 180 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: i * 0.3, duration: 0.5, type: "spring" }}
      className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border border-white/20 flex flex-col items-center justify-center font-bold flex-shrink-0"
      style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}
    >
      <span className={isRed(card.suit) ? "text-red-400 text-lg" : "text-gray-200 text-lg"}>{card.rank}</span>
      <span className={`text-xl ${isRed(card.suit) ? "text-red-400" : "text-gray-300"}`}>{card.suit}</span>
    </motion.div>
  );
}

export default function BaccaratGame() {
  const wallet = useWallet();
  const [shoe, setShoe] = useState<Card[]>(createShoe);
  const [phase, setPhase] = useState<Phase>("betting");
  const [betSide, setBetSide] = useState<BetSide | null>(null);
  const [betAmt, setBetAmt] = useState(25);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [result, setResult] = useState("");
  const [winAmt, setWinAmt] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  function deal() {
    if (!betSide || betAmt > wallet.balance) return;
    wallet.subtract(betAmt);
    setPhase("dealing");
    setResult("");
    setWinAmt(0);

    let s = shoe.length < 30 ? createShoe() : [...shoe];

    const p1 = s.pop()!; const b1 = s.pop()!;
    const p2 = s.pop()!; const b2 = s.pop()!;
    const pCards = [p1, p2];
    const bCards = [b1, b2];

    // Check naturals
    if (isNatural(pCards) || isNatural(bCards)) {
      setShoe(s);
      setPlayerCards(pCards);
      setBankerCards(bCards);
      setTimeout(() => resolve(pCards, bCards), 1200);
      return;
    }

    // Player third card
    let playerThird: Card | null = null;
    if (playerDrawsThird(pCards)) {
      playerThird = s.pop()!;
      pCards.push(playerThird);
    }

    // Banker third card
    if (bankerDrawsThird(bCards, playerThird)) {
      bCards.push(s.pop()!);
    }

    setShoe(s);
    setPlayerCards([...pCards]);
    setBankerCards([...bCards]);
    setTimeout(() => resolve(pCards, bCards), 1800);
  }

  function resolve(pCards: Card[], bCards: Card[]) {
    const pt = handTotal(pCards);
    const bt = handTotal(bCards);
    let winner: string;
    if (pt > bt) winner = "player";
    else if (bt > pt) winner = "banker";
    else winner = "tie";

    let win = 0;
    if (winner === "tie") {
      if (betSide === "tie") { win = betAmt + betAmt * 8; }
      else { win = betAmt; } // push on tie for player/banker bets
    } else if (winner === betSide) {
      if (betSide === "player") win = betAmt * 2;
      else if (betSide === "banker") win = betAmt + betAmt * 0.95; // 5% commission
    }

    if (win > 0) wallet.add(Math.round(win * 100) / 100);
    setWinAmt(win > betAmt ? Math.round((win - betAmt) * 100) / 100 : win === betAmt ? 0 : -betAmt);

    const label = winner === "player" ? "P" : winner === "banker" ? "B" : "T";
    setHistory(h => [label, ...h.slice(0, 19)]);

    if (winner === "tie" && betSide !== "tie") setResult("Tie — Bet Returned");
    else if (winner === betSide) setResult(winner === "tie" ? "Tie Wins! 8:1" : `${winner === "player" ? "Player" : "Banker"} Wins!`);
    else setResult(`${winner === "player" ? "Player" : winner === "banker" ? "Banker" : "Tie"} wins — You lose`);

    setPhase("done");
  }

  function newRound() {
    setPhase("betting");
    setPlayerCards([]);
    setBankerCards([]);
    setResult("");
    setWinAmt(0);
  }

  const sideBtnClass = (side: BetSide) =>
    `flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all ${betSide === side ? "scale-105 brightness-125" : "hover:brightness-110"} disabled:opacity-40`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="text-3xl sm:text-4xl font-black text-center mb-2 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
        BACCARAT
      </motion.h1>
      <p className="text-center text-gray-500 text-sm mb-6">Punto Banco • Banker pays 0.95×</p>

      {/* Shoe indicator */}
      <div className="flex justify-center mb-4">
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
          Shoe: {shoe.length} cards ({Math.round(shoe.length / (NUM_DECKS * 52) * 100)}%)
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-white/10 p-4 sm:p-6 mb-6"
        style={{ background: "linear-gradient(135deg, #1a0a00, #2a1500, #1a0a00)" }}>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Player side */}
          <div className={`p-4 rounded-xl border ${phase === "done" && result.toLowerCase().includes("player wins") ? "border-blue-400/50 bg-blue-500/5" : "border-white/5"}`}>
            <div className="text-sm text-blue-400 font-bold mb-2">PLAYER</div>
            <div className="flex gap-2 min-h-[7rem] flex-wrap">
              {playerCards.map((c, i) => <BCard key={i} card={c} i={i} />)}
            </div>
            {playerCards.length > 0 && (
              <div className="mt-2 text-center text-2xl font-black text-blue-400">{handTotal(playerCards)}</div>
            )}
          </div>

          {/* Banker side */}
          <div className={`p-4 rounded-xl border ${phase === "done" && result.toLowerCase().includes("banker wins") ? "border-red-400/50 bg-red-500/5" : "border-white/5"}`}>
            <div className="text-sm text-red-400 font-bold mb-2">BANKER</div>
            <div className="flex gap-2 min-h-[7rem] flex-wrap">
              {bankerCards.map((c, i) => <BCard key={i} card={c} i={i} />)}
            </div>
            {bankerCards.length > 0 && (
              <div className="mt-2 text-center text-2xl font-black text-red-400">{handTotal(bankerCards)}</div>
            )}
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-3 rounded-xl bg-black/50 border border-amber-500/30 mb-4">
              <div className="text-amber-400 font-bold text-lg">{result}</div>
              {winAmt !== 0 && (
                <div className={`text-sm mt-1 ${winAmt > 0 ? "text-green-400" : "text-red-400"}`}>
                  {winAmt > 0 ? `+$${winAmt.toFixed(2)}` : `-$${betAmt.toFixed(2)}`}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* History */}
      {history.length > 0 && (
        <div className="flex gap-1.5 justify-center mb-6 flex-wrap">
          {history.map((h, i) => (
            <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-white/10
              ${h === "P" ? "bg-blue-600" : h === "B" ? "bg-red-600" : "bg-green-600"}`}>{h}</div>
          ))}
        </div>
      )}

      {/* Controls */}
      {phase === "betting" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Bet side */}
          <div className="flex gap-3">
            <button onClick={() => setBetSide("player")} disabled={phase !== "betting"}
              className={sideBtnClass("player")}
              style={{ borderColor: betSide === "player" ? "#3b82f6" : "rgba(255,255,255,0.1)", background: betSide === "player" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)" }}>
              PLAYER<br /><span className="text-xs opacity-60">1:1</span>
            </button>
            <button onClick={() => setBetSide("tie")} disabled={phase !== "betting"}
              className={sideBtnClass("tie")}
              style={{ borderColor: betSide === "tie" ? "#22c55e" : "rgba(255,255,255,0.1)", background: betSide === "tie" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)" }}>
              TIE<br /><span className="text-xs opacity-60">8:1</span>
            </button>
            <button onClick={() => setBetSide("banker")} disabled={phase !== "betting"}
              className={sideBtnClass("banker")}
              style={{ borderColor: betSide === "banker" ? "#ef4444" : "rgba(255,255,255,0.1)", background: betSide === "banker" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)" }}>
              BANKER<br /><span className="text-xs opacity-60">0.95:1</span>
            </button>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {[5, 10, 25, 100, 500].map(v => (
              <button key={v} onClick={() => setBetAmt(v)}
                className={`w-12 h-12 rounded-full font-bold text-xs border-2 transition-all ${betAmt === v ? "border-amber-400 bg-amber-500/20 text-amber-400 scale-110" : "border-white/20 bg-white/5 text-gray-300 hover:border-white/40"}`}>${v}</button>
            ))}
          </div>

          <div className="text-center">
            <button onClick={deal} disabled={!betSide || betAmt > wallet.balance}
              className="px-10 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40">
              Deal — ${betAmt}
            </button>
          </div>
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
