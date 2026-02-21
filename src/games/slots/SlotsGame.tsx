import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣', '⭐', '🃏'];
const WEIGHTS = [20, 18, 16, 14, 10, 6, 4, 8, 4];
const PAYOUTS: Record<string, number[]> = {
  '🍒': [0, 0, 2, 5, 10], '🍋': [0, 0, 2, 5, 12], '🍊': [0, 0, 3, 8, 15],
  '🍇': [0, 0, 4, 10, 20], '🔔': [0, 0, 5, 15, 30], '💎': [0, 0, 10, 30, 100],
  '7️⃣': [0, 0, 20, 50, 200], '⭐': [0, 0, 0, 0, 0], '🃏': [0, 0, 0, 0, 0],
};

const PAYLINES: [number, number][][] = [
  [[0,0],[0,1],[0,2],[0,3],[0,4]], [[1,0],[1,1],[1,2],[1,3],[1,4]], [[2,0],[2,1],[2,2],[2,3],[2,4]],
  [[0,0],[1,1],[2,2],[1,3],[0,4]], [[2,0],[1,1],[0,2],[1,3],[2,4]],
  [[0,0],[0,1],[1,2],[0,3],[0,4]], [[2,0],[2,1],[1,2],[2,3],[2,4]],
  [[1,0],[0,1],[0,2],[0,3],[1,4]], [[1,0],[2,1],[2,2],[2,3],[1,4]],
  [[0,0],[1,1],[1,2],[1,3],[0,4]],
];

function weightedRandom(): string {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function generateGrid(): string[][] {
  return Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => weightedRandom()));
}

function evaluateWins(grid: string[][], bet: number, multiplier: number): { total: number; lines: number[]; scatters: number; } {
  let total = 0;
  const lines: number[] = [];
  // Paylines
  PAYLINES.forEach((pl, idx) => {
    const syms = pl.map(([r, c]) => grid[r][c]);
    const first = syms[0] === '⭐' ? syms.find(s => s !== '⭐') || '⭐' : syms[0];
    let count = 0;
    for (const s of syms) {
      if (s === first || s === '⭐') count++;
      else break;
    }
    if (count >= 3 && PAYOUTS[first]) {
      const win = PAYOUTS[first][count - 1] * bet * multiplier;
      if (win > 0) { total += win; lines.push(idx); }
    }
  });
  // Scatters (🃏)
  let scatters = 0;
  grid.forEach(row => row.forEach(s => { if (s === '🃏') scatters++; }));
  return { total, lines, scatters };
}

export default function SlotsGame() {
  const { balance, add, subtract } = useWallet();
  const [grid, setGrid] = useState<string[][]>(() => generateGrid());
  const [bet, setBet] = useState(5);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [winLines, setWinLines] = useState<number[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [message, setMessage] = useState('');
  const [reelOffsets, setReelOffsets] = useState([0, 0, 0, 0, 0]);
  const spinIdRef = useRef(0);

  const addChipToBet = (v: number) => {
    if (spinning) return;
    setBet(p => Math.min(p + v, balance));
  };

  const spin = useCallback(() => {
    if (spinning) return;
    const isFree = freeSpins > 0;
    if (!isFree) {
      if (bet > balance || bet < 1) return;
      if (!subtract(bet)) return;
    } else {
      setFreeSpins(f => f - 1);
    }

    setSpinning(true);
    setLastWin(0);
    setWinLines([]);
    setMessage('');
    const id = ++spinIdRef.current;

    // Animate reels
    setReelOffsets([1, 1, 1, 1, 1]);

    const newGrid = generateGrid();

    // Staggered stop
    const stops = [600, 900, 1200, 1500, 1800];
    stops.forEach((delay, col) => {
      setTimeout(() => {
        if (spinIdRef.current !== id) return;
        setReelOffsets(prev => {
          const n = [...prev];
          n[col] = 0;
          return n;
        });
      }, delay);
    });

    setTimeout(() => {
      if (spinIdRef.current !== id) return;
      setGrid(newGrid);
      const mult = isFree ? 2 : 1;
      const result = evaluateWins(newGrid, bet, mult);
      if (result.total > 0) {
        add(result.total);
        setLastWin(result.total);
        setWinLines(result.lines);
        setMessage(`Won $${result.total.toFixed(2)}!`);
      }
      if (result.scatters >= 3) {
        const spins = result.scatters === 3 ? 10 : result.scatters === 4 ? 15 : 25;
        setFreeSpins(f => f + spins);
        setMessage(m => m + ` +${spins} Free Spins!`);
      }
      setSpinning(false);
    }, 2000);
  }, [spinning, bet, balance, freeSpins, subtract, add]);

  const chips = [1, 5, 10, 25, 100];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl sm:text-4xl font-black text-purple-400 mb-2">
        🎰 Lucky Slots
      </motion.h1>

      {freeSpins > 0 && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 font-bold text-sm">
          ⭐ {freeSpins} Free Spins (2× Multiplier)
        </motion.div>
      )}

      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-6 py-2 rounded-xl glass text-green-400 font-bold text-lg">
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot Machine */}
      <div className="glass-strong rounded-3xl p-4 sm:p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-purple-950/20 rounded-3xl" />
        <div className="relative z-10">
          {/* Reel Window */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 p-3 sm:p-4 bg-black/40 rounded-2xl border border-white/5">
            {[0, 1, 2, 3, 4].map(col => (
              <div key={col} className="flex flex-col gap-2">
                {[0, 1, 2].map(row => {
                  const isWin = winLines.some(li => PAYLINES[li]?.some(([r, c]) => r === row && c === col));
                  return (
                    <motion.div
                      key={`${row}-${col}`}
                      animate={{
                        y: reelOffsets[col] ? [0, -20, 20, -10, 10, 0] : 0,
                        scale: isWin ? [1, 1.15, 1] : 1,
                      }}
                      transition={{
                        y: { duration: 0.3, repeat: reelOffsets[col] ? Infinity : 0, ease: 'linear' as const },
                        scale: { duration: 0.6, repeat: isWin ? Infinity : 0 },
                      }}
                      className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl ${isWin ? 'bg-amber-400/20 ring-2 ring-amber-400/60' : 'bg-white/5'} transition-colors`}
                    >
                      {spinning && reelOffsets[col] ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : grid[row]?.[col] || '?'}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg space-y-4">
        {/* Bet + Chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {chips.map(v => (
            <motion.button key={v} whileTap={{ scale: 0.9 }}
              onClick={() => addChipToBet(v)}
              disabled={spinning}
              className="w-12 h-12 rounded-full font-bold text-xs border-2 border-purple-400/30 bg-purple-900/30 text-purple-300 hover:border-purple-400 disabled:opacity-30 transition-all">
              +${v}
            </motion.button>
          ))}
          <button onClick={() => setBet(0)} disabled={spinning} className="text-xs text-white/40 hover:text-white/70 disabled:opacity-20 ml-2">Clear</button>
        </div>

        <div className="text-center">
          <span className="text-white/40 text-sm">Bet: </span>
          <span className="text-2xl font-bold text-purple-400">${bet}</span>
          <span className="text-white/30 text-sm ml-2">× {PAYLINES.length} lines = ${bet * PAYLINES.length}</span>
        </div>

        {lastWin > 0 && (
          <div className="text-center text-amber-400 font-bold text-xl animate-pulse">
            Last Win: ${lastWin.toFixed(2)}
          </div>
        )}

        {/* Spin Button */}
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={spin}
            disabled={spinning || (freeSpins === 0 && (bet < 1 || bet > balance))}
            className="px-12 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 text-white font-black text-xl shadow-lg shadow-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-purple-500/50 transition-shadow"
          >
            {spinning ? '🎰 Spinning...' : freeSpins > 0 ? `Free Spin (${freeSpins})` : 'SPIN'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
