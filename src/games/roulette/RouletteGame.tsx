import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';

const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const numColor = (n: number): 'red' | 'black' | 'green' => n === 0 ? 'green' : RED_NUMS.includes(n) ? 'red' : 'black';
const colorMap = { red: '#ef4444', black: '#1e1e2e', green: '#22c55e' };

type BetType = { label: string; numbers: number[]; payout: number };

const outsideBets: BetType[] = [
  { label: 'Red', numbers: RED_NUMS, payout: 2 },
  { label: 'Black', numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter(n => !RED_NUMS.includes(n)), payout: 2 },
  { label: 'Even', numbers: Array.from({ length: 18 }, (_, i) => (i + 1) * 2), payout: 2 },
  { label: 'Odd', numbers: Array.from({ length: 18 }, (_, i) => i * 2 + 1), payout: 2 },
  { label: '1-18', numbers: Array.from({ length: 18 }, (_, i) => i + 1), payout: 2 },
  { label: '19-36', numbers: Array.from({ length: 18 }, (_, i) => i + 19), payout: 2 },
  { label: '1st 12', numbers: Array.from({ length: 12 }, (_, i) => i + 1), payout: 3 },
  { label: '2nd 12', numbers: Array.from({ length: 12 }, (_, i) => i + 13), payout: 3 },
  { label: '3rd 12', numbers: Array.from({ length: 12 }, (_, i) => i + 25), payout: 3 },
];

interface Bet { type: string; numbers: number[]; amount: number; payout: number; }

export default function RouletteGame() {
  const { balance, add, subtract } = useWallet();
  const [chipValue, setChipValue] = useState(5);
  const [bets, setBets] = useState<Bet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [rotation, setRotation] = useState(0);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  const placeBet = useCallback((label: string, numbers: number[], payout: number) => {
    if (spinning) return;
    if (chipValue > balance - totalBet) return;
    setBets(prev => {
      const existing = prev.findIndex(b => b.type === label);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], amount: updated[existing].amount + chipValue };
        return updated;
      }
      return [...prev, { type: label, numbers, amount: chipValue, payout }];
    });
  }, [spinning, chipValue, balance, totalBet]);

  const clearBets = () => { if (!spinning) setBets([]); };
  const undoBet = () => { if (!spinning && bets.length > 0) setBets(b => b.slice(0, -1)); };

  const spin = () => {
    if (spinning || totalBet === 0) return;
    if (!subtract(totalBet)) return;
    setSpinning(true);
    setResult(null);
    setWinAmount(0);
    const winner = Math.floor(Math.random() * 37);
    const newRot = rotation + 1440 + Math.random() * 360;
    setRotation(newRot);

    setTimeout(() => {
      setResult(winner);
      setHistory(h => [winner, ...h.slice(0, 19)]);
      let won = 0;
      bets.forEach(b => {
        if (b.numbers.includes(winner)) {
          won += b.amount * b.payout;
        }
      });
      if (won > 0) add(won);
      setWinAmount(won);
      setSpinning(false);
    }, 3000);
  };

  const newRound = () => { setResult(null); setWinAmount(0); setBets([]); };

  const chips = [1, 5, 10, 25, 100, 500];
  const numbers = Array.from({ length: 37 }, (_, i) => i);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl sm:text-4xl font-black text-green-400 mb-6">
        ◉ Roulette
      </motion.h1>

      {/* Result Banner */}
      <AnimatePresence>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 text-center"
          >
            <div className="inline-flex items-center gap-3 glass-strong rounded-2xl px-6 py-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-xl"
                style={{ background: colorMap[numColor(result)] }}>
                {result}
              </div>
              <div>
                <div className="text-white/50 text-sm">{numColor(result).toUpperCase()}</div>
                <div className={`font-bold text-lg ${winAmount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {winAmount > 0 ? `+$${winAmount.toFixed(2)}` : 'No win'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="flex gap-1.5 mb-6 flex-wrap justify-center max-w-lg">
          {history.slice(0, 15).map((n, i) => (
            <motion.div key={`${i}-${n}`} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: colorMap[numColor(n)] }}>
              {n}
            </motion.div>
          ))}
        </div>
      )}

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
        {/* Wheel */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72">
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 3, ease: [0.2, 0.8, 0.3, 1] }}
              className="w-full h-full rounded-full border-4 border-amber-500/30 bg-gradient-to-br from-green-900 to-green-950 relative shadow-2xl shadow-green-900/30"
            >
              {numbers.map((n, i) => {
                const angle = (i * 360) / 37;
                return (
                  <div key={n} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] font-bold text-white/80">
                      {n}
                    </div>
                  </div>
                );
              })}
              <div className="absolute inset-6 sm:inset-10 rounded-full bg-gradient-to-br from-green-800 to-green-950 border border-green-600/20 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">
                  {spinning ? '...' : result !== null ? result : '?'}
                </span>
              </div>
            </motion.div>
            {/* Ball indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1">
              <div className="w-3 h-3 rounded-full bg-white shadow-lg shadow-white/50" />
            </div>
          </div>

          {/* Spin Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={result !== null ? newRound : spin}
            disabled={spinning || (result === null && totalBet === 0)}
            className="px-10 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-700 text-white font-bold text-lg shadow-lg shadow-green-500/25 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-green-500/40 transition-shadow"
          >
            {spinning ? 'Spinning...' : result !== null ? 'New Spin' : `Spin ($${totalBet})`}
          </motion.button>
        </div>

        {/* Betting Board */}
        <div className="flex-1 space-y-4">
          {/* Chip Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {chips.map(v => (
              <motion.button key={v} whileTap={{ scale: 0.9 }}
                onClick={() => setChipValue(v)}
                className={`w-12 h-12 rounded-full font-bold text-xs border-2 transition-all ${chipValue === v ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-lg shadow-amber-500/20' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'}`}>
                ${v}
              </motion.button>
            ))}
            <button onClick={undoBet} disabled={spinning || bets.length === 0} className="text-xs text-white/40 hover:text-white/70 disabled:opacity-20 ml-2">Undo</button>
            <button onClick={clearBets} disabled={spinning || bets.length === 0} className="text-xs text-white/40 hover:text-white/70 disabled:opacity-20">Clear</button>
          </div>

          {/* Number Grid */}
          <div className="glass rounded-xl p-3 sm:p-4">
            {/* Zero */}
            <div className="mb-2">
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => placeBet('0', [0], 36)}
                className={`w-full py-2 rounded-lg text-white font-bold text-sm transition-all ${bets.some(b => b.type === '0') ? 'ring-2 ring-amber-400 bg-green-600' : 'bg-green-700/60 hover:bg-green-600/80'}`}>
                0 {bets.find(b => b.type === '0') ? `($${bets.find(b => b.type === '0')!.amount})` : ''}
              </motion.button>
            </div>

            {/* 1-36 Grid: 3 columns × 12 rows */}
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, row) =>
                [3 - 0, 3 - 1, 3 - 2].map(col => {
                  const n = row * 3 + (3 - col);
                  const c = numColor(n);
                  const hasBet = bets.find(b => b.type === `straight-${n}`);
                  const isWinner = result === n;
                  return (
                    <motion.button key={n} whileTap={{ scale: 0.95 }}
                      onClick={() => placeBet(`straight-${n}`, [n], 36)}
                      className={`py-2 rounded text-white font-bold text-sm transition-all relative ${isWinner ? 'ring-2 ring-amber-400 animate-pulse' : ''} ${hasBet ? 'ring-1 ring-amber-400/60' : ''}`}
                      style={{ background: c === 'red' ? '#dc2626' : '#1e1e2e' }}>
                      {n}
                      {hasBet && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-[8px] text-black font-bold flex items-center justify-center">{hasBet.amount}</span>}
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Outside Bets */}
            <div className="grid grid-cols-3 gap-1 mt-2">
              {outsideBets.map(ob => {
                const hasBet = bets.find(b => b.type === ob.label);
                const isWin = result !== null && ob.numbers.includes(result);
                return (
                  <motion.button key={ob.label} whileTap={{ scale: 0.95 }}
                    onClick={() => placeBet(ob.label, ob.numbers, ob.payout)}
                    className={`py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      ob.label === 'Red' ? 'bg-red-700/40 text-red-300 hover:bg-red-700/60' :
                      ob.label === 'Black' ? 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80' :
                      'bg-white/5 text-white/70 hover:bg-white/10'
                    } ${hasBet ? 'ring-1 ring-amber-400' : ''} ${isWin ? 'ring-2 ring-green-400' : ''}`}>
                    {ob.label}{hasBet ? ` $${hasBet.amount}` : ''}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Active Bets Summary */}
          {bets.length > 0 && (
            <div className="glass rounded-xl p-3 text-sm">
              <div className="text-white/40 text-xs mb-2">Active Bets:</div>
              <div className="flex flex-wrap gap-2">
                {bets.map((b, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-amber-400/10 text-amber-300 text-xs">
                    {b.type}: ${b.amount}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-right text-amber-400 font-bold">Total: ${totalBet}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
