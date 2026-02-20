import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useWallet } from "../../context/WalletContext";

const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
function numColor(n: number): "red" | "black" | "green" { return n === 0 ? "green" : RED_NUMS.includes(n) ? "red" : "black"; }
const colorMap = { red: "#ef4444", black: "#1a1a2e", green: "#22c55e" };

interface Bet { type: string; nums: number[]; amount: number; payout: number; }

const OUTSIDE_BETS: { label: string; nums: number[]; payout: number }[] = [
  { label: "Red", nums: RED_NUMS, payout: 2 },
  { label: "Black", nums: Array.from({ length: 36 }, (_, i) => i + 1).filter(n => !RED_NUMS.includes(n)), payout: 2 },
  { label: "Odd", nums: Array.from({ length: 36 }, (_, i) => i + 1).filter(n => n % 2 === 1), payout: 2 },
  { label: "Even", nums: Array.from({ length: 36 }, (_, i) => i + 1).filter(n => n % 2 === 0), payout: 2 },
  { label: "1-18", nums: Array.from({ length: 18 }, (_, i) => i + 1), payout: 2 },
  { label: "19-36", nums: Array.from({ length: 18 }, (_, i) => i + 19), payout: 2 },
  { label: "1st 12", nums: Array.from({ length: 12 }, (_, i) => i + 1), payout: 3 },
  { label: "2nd 12", nums: Array.from({ length: 12 }, (_, i) => i + 13), payout: 3 },
  { label: "3rd 12", nums: Array.from({ length: 12 }, (_, i) => i + 25), payout: 3 },
];

export default function RouletteGame() {
  const wallet = useWallet();
  const [bets, setBets] = useState<Bet[]>([]);
  const [chipVal, setChipVal] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [wheelAngle, setWheelAngle] = useState(0);

  const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  const placeBet = useCallback((type: string, nums: number[], payout: number) => {
    if (spinning) return;
    if (chipVal > wallet.balance) return;
    if (!wallet.subtract(chipVal)) return;
    setBets(prev => {
      const existing = prev.findIndex(b => b.type === type);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], amount: updated[existing].amount + chipVal };
        return updated;
      }
      return [...prev, { type, nums, amount: chipVal, payout }];
    });
  }, [chipVal, spinning, wallet]);

  function spin() {
    if (bets.length === 0 || spinning) return;
    setSpinning(true);
    setResult(null);
    setLastWin(0);
    const winner = Math.floor(Math.random() * 37);
    const idx = WHEEL_ORDER.indexOf(winner);
    const sliceAngle = 360 / 37;
    const targetAngle = 360 * 5 + (360 - idx * sliceAngle);
    setWheelAngle(prev => prev + targetAngle);

    setTimeout(() => {
      setResult(winner);
      setHistory(h => [winner, ...h.slice(0, 11)]);
      let winnings = 0;
      for (const bet of bets) {
        if (bet.nums.includes(winner)) {
          winnings += bet.amount * bet.payout;
        }
      }
      if (winnings > 0) { wallet.add(winnings); setLastWin(winnings); }
      setBets([]);
      setSpinning(false);
    }, 3500);
  }

  const clearBets = () => { bets.forEach(b => wallet.add(b.amount)); setBets([]); };

  // Board layout: 3 rows x 12 cols
  const rows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="text-3xl sm:text-4xl font-black text-center mb-6 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
        EUROPEAN ROULETTE
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wheel */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-white/5">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72">
            <motion.div animate={{ rotate: wheelAngle }} transition={{ duration: 3.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="w-full h-full rounded-full border-4 border-amber-600/50 relative"
              style={{ background: "conic-gradient(from 0deg, #16a34a, #1a1a2e, #ef4444, #1a1a2e, #ef4444, #1a1a2e, #16a34a, #ef4444, #1a1a2e, #ef4444, #1a1a2e, #ef4444, #1a1a2e, #16a34a)" }}>
              <div className="absolute inset-4 rounded-full bg-gray-900 border-2 border-amber-600/30 flex items-center justify-center">
                <div className="text-center">
                  {result !== null && !spinning && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <div className="text-4xl font-black" style={{ color: colorMap[numColor(result)] }}>{result}</div>
                      <div className="text-xs text-gray-400 uppercase">{numColor(result)}</div>
                    </motion.div>
                  )}
                  {spinning && <div className="text-gray-400 animate-pulse text-sm">Spinning...</div>}
                  {result === null && !spinning && <div className="text-gray-500 text-sm">Place Bets</div>}
                </div>
              </div>
            </motion.div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-5 bg-amber-400 rounded-b-full z-10" />
          </div>

          {/* History */}
          <div className="mt-4 flex gap-1.5 flex-wrap justify-center">
            {history.map((n, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-white/10"
                style={{ background: colorMap[numColor(n)] }}>{n}</motion.div>
            ))}
          </div>

          {lastWin > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-lg font-bold text-green-400">Won ${lastWin.toFixed(2)}!</motion.div>
          )}
        </motion.div>

        {/* Betting Board */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="p-4 rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
          {/* Number grid */}
          <div className="min-w-[400px]">
            {/* Zero */}
            <div className="flex gap-1 mb-1">
              <button onClick={() => placeBet("0", [0], 36)} disabled={spinning}
                className="w-full py-3 rounded-lg bg-green-700 hover:bg-green-600 font-bold text-sm transition-all border border-green-500/30 disabled:opacity-50">0</button>
            </div>
            {/* Number rows */}
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-1 mb-1">
                {row.map(n => (
                  <button key={n} onClick={() => placeBet(`${n}`, [n], 36)} disabled={spinning}
                    className="flex-1 py-2.5 rounded-md text-xs font-bold transition-all hover:brightness-125 disabled:opacity-50 border border-white/10"
                    style={{ background: colorMap[numColor(n)] }}>{n}</button>
                ))}
              </div>
            ))}
            {/* Outside bets */}
            <div className="grid grid-cols-3 gap-1 mt-2">
              {OUTSIDE_BETS.map(ob => (
                <button key={ob.label} onClick={() => placeBet(ob.label, ob.nums, ob.payout)} disabled={spinning}
                  className="py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all disabled:opacity-50">
                  {ob.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chip selector */}
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {[1, 5, 10, 25, 100, 500].map(v => (
              <button key={v} onClick={() => setChipVal(v)}
                className={`w-12 h-12 rounded-full text-xs font-bold border-2 transition-all ${chipVal === v ? "border-emerald-400 bg-emerald-500/20 text-emerald-400 scale-110" : "border-white/20 bg-white/5 text-gray-300 hover:border-white/40"}`}>${v}</button>
            ))}
          </div>

          {/* Active bets */}
          {bets.length > 0 && (
            <div className="mt-3 text-xs text-gray-400 max-h-24 overflow-y-auto">
              {bets.map((b, i) => <div key={i} className="flex justify-between py-0.5"><span>{b.type}</span><span className="text-amber-400">${b.amount}</span></div>)}
              <div className="flex justify-between font-bold text-white border-t border-white/10 mt-1 pt-1"><span>Total</span><span>${totalBet}</span></div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {bets.length > 0 && !spinning && (
              <button onClick={clearBets} className="flex-1 py-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-600/30 transition-all">Clear</button>
            )}
            <button onClick={spin} disabled={bets.length === 0 || spinning}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm hover:brightness-110 transition-all active:scale-95 disabled:opacity-40">
              {spinning ? "Spinning..." : "Spin"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
