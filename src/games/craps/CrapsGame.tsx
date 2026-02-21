import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';

type CrapsPhase = 'comeOut' | 'point' | 'rolling' | 'resolved';
type BetKind = 'pass' | 'dontPass' | 'come' | 'dontCome' | 'passOdds' | 'dontPassOdds' | 'comeOdds' | 'dontComeOdds';

interface CrapsBet {
  kind: BetKind;
  amount: number;
  point?: number; // for come/dontCome that have traveled
}

function rollDice(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
}

function oddsPayoutPass(point: number, amount: number): number {
  if (point === 4 || point === 10) return amount * 2;
  if (point === 5 || point === 9) return amount * 1.5;
  if (point === 6 || point === 8) return amount * 1.2;
  return amount;
}

function oddsPayoutDont(point: number, amount: number): number {
  if (point === 4 || point === 10) return amount * 0.5;
  if (point === 5 || point === 9) return amount * (2 / 3);
  if (point === 6 || point === 8) return amount * (5 / 6);
  return amount;
}

const POINT_NUMS = [4, 5, 6, 8, 9, 10];

function DiceView({ values, rolling }: { values: [number, number]; rolling: boolean }) {
  const dots = (n: number) => {
    const positions: Record<number, [number, number][]> = {
      1: [[1, 1]], 2: [[0, 2], [2, 0]], 3: [[0, 2], [1, 1], [2, 0]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]], 5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
    };
    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-12 h-12 sm:w-16 sm:h-16 p-1.5 sm:p-2">
        {Array.from({ length: 9 }, (_, i) => {
          const r = Math.floor(i / 3), c = i % 3;
          const show = positions[n]?.some(([pr, pc]) => pr === r && pc === c);
          return <div key={i} className={`rounded-full ${show ? 'bg-white' : ''}`} />;
        })}
      </div>
    );
  };

  return (
    <div className="flex gap-3 justify-center">
      {values.map((v, i) => (
        <motion.div key={i}
          animate={rolling ? { rotate: [0, 360, 720], scale: [1, 0.8, 1] } : { rotate: 0, scale: 1 }}
          transition={{ duration: rolling ? 0.6 : 0.3, ease: 'easeOut' as const }}
          className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl bg-white shadow-lg shadow-white/10 flex items-center justify-center"
        >
          {dots(v)}
        </motion.div>
      ))}
    </div>
  );
}

export default function CrapsGame() {
  const { balance, add, subtract } = useWallet();
  const [, setPhase] = useState<CrapsPhase>('comeOut');
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  const [rolling, setRolling] = useState(false);
  const [tablePoint, setTablePoint] = useState<number | null>(null);
  const [bets, setBets] = useState<CrapsBet[]>([]);
  const [chipValue, setChipValue] = useState(10);
  const [message, setMessage] = useState('Place Pass or Don\'t Pass bet to start');
  const [lastResults, setLastResults] = useState<number[]>([]);
  const [roundWinnings, setRoundWinnings] = useState(0);

  const hasBet = (kind: BetKind) => bets.some(b => b.kind === kind);
  const getBet = (kind: BetKind) => bets.find(b => b.kind === kind);

  const placeBet = useCallback((kind: BetKind) => {
    if (rolling) return;
    // Validate bet placement
    if (kind === 'pass' || kind === 'dontPass') {
      if (tablePoint !== null) return; // Only on comeOut
    }
    if (kind === 'come' || kind === 'dontCome') {
      if (tablePoint === null) return; // Only during point phase
    }
    if (kind === 'passOdds' || kind === 'dontPassOdds') {
      if (tablePoint === null) return;
      if (kind === 'passOdds' && !hasBet('pass')) return;
      if (kind === 'dontPassOdds' && !hasBet('dontPass')) return;
    }
    if (kind === 'comeOdds' || kind === 'dontComeOdds') {
      // Must have a come/dontCome bet with a point
      const parent = kind === 'comeOdds' ? 'come' : 'dontCome';
      const parentBet = bets.find(b => b.kind === parent && b.point !== undefined);
      if (!parentBet) return;
    }

    if (chipValue > balance) return;
    if (!subtract(chipValue)) return;

    setBets(prev => {
      const existing = prev.findIndex(b => b.kind === kind && (kind !== 'come' && kind !== 'dontCome'));
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], amount: updated[existing].amount + chipValue };
        return updated;
      }
      return [...prev, { kind, amount: chipValue }];
    });
  }, [rolling, tablePoint, chipValue, balance, subtract, bets]);

  const roll = useCallback(() => {
    if (rolling) return;
    const hasAnyBet = bets.length > 0;
    if (!hasAnyBet) { setMessage('Place a bet first!'); return; }

    setRolling(true);
    setRoundWinnings(0);
    const newDice = rollDice();

    setTimeout(() => {
      setDice(newDice);
      setRolling(false);
      const total = newDice[0] + newDice[1];
      setLastResults(prev => [total, ...prev.slice(0, 14)]);

      let winnings = 0;
      const newBets: CrapsBet[] = [];
      let newPoint = tablePoint;
      let msg = `Rolled ${total}`;

      if (tablePoint === null) {
        // COME-OUT ROLL
        if (total === 7 || total === 11) {
          msg = `${total}! Pass wins!`;
          bets.forEach(b => {
            if (b.kind === 'pass') { winnings += b.amount * 2; }
            else if (b.kind === 'dontPass') { /* loses */ }
            else newBets.push(b);
          });
        } else if (total === 2 || total === 3) {
          msg = `${total}! Don't Pass wins!`;
          bets.forEach(b => {
            if (b.kind === 'dontPass') { winnings += b.amount * 2; }
            else if (b.kind === 'pass') { /* loses */ }
            else newBets.push(b);
          });
        } else if (total === 12) {
          msg = `12! Pass loses, Don't Pass pushes`;
          bets.forEach(b => {
            if (b.kind === 'dontPass') { winnings += b.amount; } // push
            else if (b.kind === 'pass') { /* loses */ }
            else newBets.push(b);
          });
        } else {
          // Point established
          newPoint = total;
          msg = `Point is ${total}!`;
          bets.forEach(b => newBets.push(b));
        }
      } else {
        // POINT PHASE
        bets.forEach(b => {
          if (b.kind === 'pass') {
            if (total === tablePoint) { winnings += b.amount * 2; msg = `${total}! Point hit! Pass wins!`; }
            else if (total === 7) { msg = `Seven out! Pass loses`; }
            else newBets.push(b);
          } else if (b.kind === 'dontPass') {
            if (total === 7) { winnings += b.amount * 2; msg = `Seven out! Don't Pass wins!`; }
            else if (total === tablePoint) { /* loses */ }
            else newBets.push(b);
          } else if (b.kind === 'passOdds') {
            if (total === tablePoint) { winnings += b.amount + oddsPayoutPass(tablePoint, b.amount); }
            else if (total === 7) { /* loses */ }
            else newBets.push(b);
          } else if (b.kind === 'dontPassOdds') {
            if (total === 7) { winnings += b.amount + oddsPayoutDont(tablePoint, b.amount); }
            else if (total === tablePoint) { /* loses */ }
            else newBets.push(b);
          } else if (b.kind === 'come') {
            if (b.point === undefined) {
              // Come bet not yet traveled
              if (total === 7 || total === 11) { winnings += b.amount * 2; }
              else if (total === 2 || total === 3 || total === 12) { /* loses */ }
              else { newBets.push({ ...b, point: total }); }
            } else {
              // Come bet with point
              if (total === b.point) { winnings += b.amount * 2; }
              else if (total === 7) { /* loses */ }
              else newBets.push(b);
            }
          } else if (b.kind === 'dontCome') {
            if (b.point === undefined) {
              if (total === 2 || total === 3) { winnings += b.amount * 2; }
              else if (total === 7 || total === 11) { /* loses */ }
              else if (total === 12) { winnings += b.amount; } // push
              else { newBets.push({ ...b, point: total }); }
            } else {
              if (total === 7) { winnings += b.amount * 2; }
              else if (total === b.point) { /* loses */ }
              else newBets.push(b);
            }
          } else if (b.kind === 'comeOdds') {
            const comeBet = bets.find(cb => cb.kind === 'come' && cb.point !== undefined);
            if (comeBet && comeBet.point) {
              if (total === comeBet.point) { winnings += b.amount + oddsPayoutPass(comeBet.point, b.amount); }
              else if (total === 7) { /* loses */ }
              else newBets.push(b);
            } else newBets.push(b);
          } else if (b.kind === 'dontComeOdds') {
            const dcBet = bets.find(cb => cb.kind === 'dontCome' && cb.point !== undefined);
            if (dcBet && dcBet.point) {
              if (total === 7) { winnings += b.amount + oddsPayoutDont(dcBet.point, b.amount); }
              else if (total === dcBet.point) { /* loses */ }
              else newBets.push(b);
            } else newBets.push(b);
          } else {
            newBets.push(b);
          }
        });

        // Check if point was hit or seven-out
        if (total === tablePoint || total === 7) {
          newPoint = null;
        }
      }

      if (winnings > 0) {
        add(winnings);
        setRoundWinnings(winnings);
      }
      setTablePoint(newPoint);
      setBets(newBets);
      setMessage(msg);
      setPhase(newPoint !== null ? 'point' : 'comeOut');
    }, 800);
  }, [rolling, bets, tablePoint, add]);

  const chips = [5, 10, 25, 100, 500];
  const canPlacePass = tablePoint === null && !rolling;
  const canPlaceCome = tablePoint !== null && !rolling;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl sm:text-4xl font-black text-red-400 mb-2">
        🎲 Craps
      </motion.h1>

      {/* Point Indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${tablePoint ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/30 border border-white/10'}`}>
          {tablePoint ? `ON — Point: ${tablePoint}` : 'OFF — Come Out'}
        </div>
      </div>

      {/* Message */}
      <AnimatePresence mode="wait">
        <motion.div key={message} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="glass rounded-xl px-6 py-2 mb-4 text-center">
          <span className="font-semibold text-white/90">{message}</span>
          {roundWinnings > 0 && <span className="text-green-400 font-bold ml-2">+${roundWinnings.toFixed(2)}</span>}
        </motion.div>
      </AnimatePresence>

      {/* Dice */}
      <div className="mb-6">
        <DiceView values={dice} rolling={rolling} />
        <div className="text-center mt-2 text-white/40 text-sm">Total: {dice[0] + dice[1]}</div>
      </div>

      {/* History */}
      {lastResults.length > 0 && (
        <div className="flex gap-1.5 mb-6 flex-wrap justify-center max-w-sm">
          {lastResults.map((n, i) => (
            <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${n === 7 ? 'bg-red-500 text-white' : POINT_NUMS.includes(n) ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/60'}`}>
              {n}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6">
        {/* Betting Areas */}
        <div className="flex-1 glass-strong rounded-2xl p-4 sm:p-6 space-y-3">
          <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Betting Areas</h3>

          {/* Pass / Don't Pass */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => placeBet('pass')}
              disabled={!canPlacePass}
              className={`p-4 rounded-xl text-center transition-all ${hasBet('pass') ? 'bg-green-600/30 ring-1 ring-green-400/50' : 'bg-white/5 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}>
              <div className="text-green-400 font-bold">Pass Line</div>
              <div className="text-white/40 text-xs">1:1</div>
              {getBet('pass') && <div className="text-amber-400 text-sm font-bold mt-1">${getBet('pass')!.amount}</div>}
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => placeBet('dontPass')}
              disabled={!canPlacePass}
              className={`p-4 rounded-xl text-center transition-all ${hasBet('dontPass') ? 'bg-red-600/30 ring-1 ring-red-400/50' : 'bg-white/5 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}>
              <div className="text-red-400 font-bold">Don't Pass</div>
              <div className="text-white/40 text-xs">1:1 (bar 12)</div>
              {getBet('dontPass') && <div className="text-amber-400 text-sm font-bold mt-1">${getBet('dontPass')!.amount}</div>}
            </motion.button>
          </div>

          {/* Come / Don't Come */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => placeBet('come')}
              disabled={!canPlaceCome}
              className={`p-4 rounded-xl text-center transition-all ${hasBet('come') ? 'bg-blue-600/30 ring-1 ring-blue-400/50' : 'bg-white/5 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}>
              <div className="text-blue-400 font-bold">Come</div>
              <div className="text-white/40 text-xs">1:1</div>
              {getBet('come') && <div className="text-amber-400 text-sm font-bold mt-1">${getBet('come')!.amount}{getBet('come')!.point ? ` → ${getBet('come')!.point}` : ''}</div>}
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => placeBet('dontCome')}
              disabled={!canPlaceCome}
              className={`p-4 rounded-xl text-center transition-all ${hasBet('dontCome') ? 'bg-orange-600/30 ring-1 ring-orange-400/50' : 'bg-white/5 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}>
              <div className="text-orange-400 font-bold">Don't Come</div>
              <div className="text-white/40 text-xs">1:1 (bar 12)</div>
              {getBet('dontCome') && <div className="text-amber-400 text-sm font-bold mt-1">${getBet('dontCome')!.amount}{getBet('dontCome')!.point ? ` → ${getBet('dontCome')!.point}` : ''}</div>}
            </motion.button>
          </div>

          {/* Odds */}
          {tablePoint && (
            <div className="grid grid-cols-2 gap-3">
              {hasBet('pass') && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => placeBet('passOdds')}
                  className={`p-3 rounded-xl text-center transition-all ${hasBet('passOdds') ? 'bg-green-600/20 ring-1 ring-green-400/30' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className="text-green-300 font-semibold text-sm">Pass Odds</div>
                  <div className="text-white/30 text-xs">True odds</div>
                  {getBet('passOdds') && <div className="text-amber-400 text-xs font-bold mt-1">${getBet('passOdds')!.amount}</div>}
                </motion.button>
              )}
              {hasBet('dontPass') && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => placeBet('dontPassOdds')}
                  className={`p-3 rounded-xl text-center transition-all ${hasBet('dontPassOdds') ? 'bg-red-600/20 ring-1 ring-red-400/30' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className="text-red-300 font-semibold text-sm">Don't Pass Odds</div>
                  <div className="text-white/30 text-xs">True odds</div>
                  {getBet('dontPassOdds') && <div className="text-amber-400 text-xs font-bold mt-1">${getBet('dontPassOdds')!.amount}</div>}
                </motion.button>
              )}
            </div>
          )}

          {/* Point Numbers Display */}
          <div className="grid grid-cols-6 gap-2 mt-2">
            {POINT_NUMS.map(n => (
              <div key={n} className={`py-2 rounded-lg text-center text-sm font-bold ${n === tablePoint ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/50' : 'bg-white/5 text-white/20'}`}>
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel — Chip Selector + Roll */}
        <div className="w-full lg:w-64 space-y-4">
          {/* Chips */}
          <div className="glass rounded-xl p-4">
            <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Select Chip</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {chips.map(v => (
                <motion.button key={v} whileTap={{ scale: 0.9 }}
                  onClick={() => setChipValue(v)}
                  className={`w-12 h-12 rounded-full font-bold text-xs border-2 transition-all ${chipValue === v ? 'border-red-400 bg-red-400/20 text-red-300 shadow-lg shadow-red-500/20' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'}`}>
                  ${v}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Active Bets */}
          {bets.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Active Bets</div>
              <div className="space-y-1">
                {bets.map((b, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-white/60">{b.kind}{b.point ? ` (${b.point})` : ''}</span>
                    <span className="text-amber-400 font-bold">${b.amount}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-1 mt-1 flex justify-between">
                  <span className="text-white/40 text-sm">Total</span>
                  <span className="text-amber-400 font-bold">${bets.reduce((s, b) => s + b.amount, 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Roll Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={roll}
            disabled={rolling || bets.length === 0}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white font-black text-xl shadow-lg shadow-red-500/25 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-red-500/40 transition-shadow"
          >
            {rolling ? '🎲 Rolling...' : '🎲 ROLL'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
