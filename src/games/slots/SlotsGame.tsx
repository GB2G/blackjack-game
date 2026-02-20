import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useWallet } from "../../context/WalletContext";

const SYMBOLS = ["🍒","🍋","🍊","🔔","⭐","💎","7️⃣","🎰"] as const;
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 2];
const PAYOUTS: Record<string, number[]> = {
  "🍒": [0, 0, 2, 5, 10], "🍋": [0, 0, 3, 8, 15], "🍊": [0, 0, 4, 10, 20],
  "🔔": [0, 0, 5, 15, 30], "⭐": [0, 0, 8, 20, 50], "💎": [0, 0, 10, 30, 100],
  "7️⃣": [0, 0, 15, 50, 200], "🎰": [0, 0, 20, 75, 500],
};
const PAYLINES = [
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],
];
const REELS = 5;
const ROWS = 3;

function weightedRandom(): string {
  const total = WEIGHTS.reduce((a, b) => a + b);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) { r -= WEIGHTS[i]; if (r <= 0) return SYMBOLS[i]; }
  return SYMBOLS[0];
}

function generateGrid(): string[][] {
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => weightedRandom()));
}

function evaluateWins(grid: string[][], bet: number): { totalWin: number; winLines: number[] } {
  let totalWin = 0;
  const winLines: number[] = [];
  for (let li = 0; li < PAYLINES.length; li++) {
    const line = PAYLINES[li];
    const first = grid[0][line[0]];
    let count = 1;
    for (let r = 1; r < REELS; r++) { if (grid[r][line[r]] === first) count++; else break; }
    if (count >= 3) {
      const payout = PAYOUTS[first]?.[count - 1] ?? 0;
      totalWin += payout * bet;
      winLines.push(li);
    }
  }
  return { totalWin, winLines };
}

function ReelColumn({ symbols, spinning, delay }: { symbols: string[]; spinning: boolean; delay: number }) {
  return (
    <div className="flex flex-col gap-1">
      {symbols.map((sym, i) => (
        <motion.div key={i}
          initial={spinning ? { y: -60, opacity: 0 } : {}}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delay + i * 0.05, duration: 0.4, type: "spring", stiffness: 300, damping: 20 }}
          className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl bg-gray-900/80 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl"
        >
          {sym}
        </motion.div>
      ))}
    </div>
  );
}

export default function SlotsGame() {
  const wallet = useWallet();
  const [grid, setGrid] = useState<string[][]>(generateGrid);
  const [betAmt, setBetAmt] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [winLines, setWinLines] = useState<number[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [msg, setMsg] = useState("");
  const spinCount = useRef(0);

  const spin = useCallback(() => {
    const isFree = freeSpins > 0;
    if (!isFree && betAmt > wallet.balance) return;
    if (spinning) return;

    if (!isFree) wallet.subtract(betAmt);
    else setFreeSpins(f => f - 1);

    setSpinning(true);
    setLastWin(0);
    setWinLines([]);
    setMsg("");
    spinCount.current++;

    setTimeout(() => {
      const newGrid = generateGrid();
      setGrid(newGrid);
      const { totalWin, winLines: wl } = evaluateWins(newGrid, betAmt);
      const multiplier = isFree ? 2 : 1;
      const finalWin = totalWin * multiplier;

      // Check for scatter (🎰) for free spins
      let scatterCount = 0;
      for (let r = 0; r < REELS; r++) for (let row = 0; row < ROWS; row++) { if (newGrid[r][row] === "🎰") scatterCount++; }
      if (scatterCount >= 3) {
        const fs = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 25;
        setFreeSpins(f => f + fs);
        setMsg(`🎰 ${fs} Free Spins Won!`);
      }

      if (finalWin > 0) {
        wallet.add(finalWin);
        setLastWin(finalWin);
        setWinLines(wl);
        if (!msg) setMsg(`Win $${finalWin.toFixed(2)}!`);
      }
      setSpinning(false);
    }, 800);
  }, [betAmt, spinning, wallet, freeSpins, msg]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="text-3xl sm:text-4xl font-black text-center mb-6 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
        MEGA SLOTS
      </motion.h1>

      {/* Free spins indicator */}
      {freeSpins > 0 && (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          className="text-center mb-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold">
          🎰 Free Spins: {freeSpins} remaining (2× multiplier)
        </motion.div>
      )}

      {/* Slot Machine */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border-2 border-amber-600/30 p-6 sm:p-8 mb-6"
        style={{ background: "linear-gradient(180deg, #1a0a2e, #0f0520)" }}>

        {/* Reels */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-4">
          {grid.map((reel, ri) => (
            <ReelColumn key={`${ri}-${spinCount.current}`} symbols={reel} spinning={spinning} delay={ri * 0.12} />
          ))}
        </div>

        {/* Win display */}
        {msg && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-3 rounded-xl bg-black/40 border border-amber-500/30 text-amber-400 font-bold text-lg mb-4">
            {msg}
          </motion.div>
        )}

        {/* Payline indicator */}
        {winLines.length > 0 && (
          <div className="text-center text-xs text-gray-400 mb-2">
            {winLines.length} winning payline{winLines.length > 1 ? "s" : ""}
          </div>
        )}
      </motion.div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Bet selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {[1, 5, 10, 25, 50, 100].map(v => (
            <button key={v} onClick={() => setBetAmt(v)} disabled={spinning}
              className={`w-12 h-12 rounded-full font-bold text-xs border-2 transition-all ${betAmt === v ? "border-purple-400 bg-purple-500/20 text-purple-400 scale-110" : "border-white/20 bg-white/5 text-gray-300 hover:border-white/40"} disabled:opacity-50`}>
              ${v}
            </button>
          ))}
        </div>

        {/* Spin button */}
        <div className="text-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={spin}
            disabled={spinning || (freeSpins === 0 && betAmt > wallet.balance)}
            className="px-12 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {spinning ? "⏳" : freeSpins > 0 ? "FREE SPIN" : `SPIN — $${betAmt}`}
          </motion.button>
        </div>

        {/* Last win */}
        {lastWin > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-green-400 font-bold text-xl">
            Last Win: ${lastWin.toFixed(2)}
          </motion.div>
        )}
      </div>
    </div>
  );
}
