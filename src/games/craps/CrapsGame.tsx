import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "../../context/WalletContext";

type Phase = "betting" | "comeOut" | "point" | "rolling" | "resolved";
interface CrapsBet { type: string; amount: number; point?: number; odds?: number; }

function rollDice(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
}

function oddsPayoutPass(point: number, oddsAmt: number): number {
  if (point === 4 || point === 10) return oddsAmt * 2;
  if (point === 5 || point === 9) return oddsAmt * 1.5;
  if (point === 6 || point === 8) return oddsAmt * 1.2;
  return 0;
}

function oddsPayoutDont(point: number, oddsAmt: number): number {
  if (point === 4 || point === 10) return oddsAmt * 0.5;
  if (point === 5 || point === 9) return oddsAmt * (2 / 3);
  if (point === 6 || point === 8) return oddsAmt * (5 / 6);
  return 0;
}

function DieComp({ value, rolling }: { value: number; rolling: boolean }) {
  const dots: Record<number, string[]> = {
    1: ["col-start-2 row-start-2"],
    2: ["col-start-3 row-start-1", "col-start-1 row-start-3"],
    3: ["col-start-3 row-start-1", "col-start-2 row-start-2", "col-start-1 row-start-3"],
    4: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-1 row-start-3", "col-start-3 row-start-3"],
    5: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-2 row-start-2", "col-start-1 row-start-3", "col-start-3 row-start-3"],
    6: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-1 row-start-2", "col-start-3 row-start-2", "col-start-1 row-start-3", "col-start-3 row-start-3"],
  };
  return (
    <motion.div
      animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 0.9, 1.1, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { duration: 0.6, repeat: Infinity } : { duration: 0.3 }}
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white grid grid-cols-3 grid-rows-3 p-2 gap-0.5"
    >
      {(dots[value] || []).map((cls, i) => (
        <div key={i} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-gray-900 ${cls}`} />
      ))}
    </motion.div>
  );
}

export default function CrapsGame() {
  const wallet = useWallet();
  const [phase, setPhase] = useState<Phase>("betting");
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  const [rolling, setRolling] = useState(false);
  const [tablePoint, setTablePoint] = useState<number | null>(null);
  const [bets, setBets] = useState<CrapsBet[]>([]);
  const [chipVal, setChipVal] = useState(10);
  const [msg, setMsg] = useState("");
  const [lastWin, setLastWin] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const total = dice[0] + dice[1];
  const hasBet = (type: string) => bets.find(b => b.type === type);

  function placeBet(type: string) {
    if (rolling) return;
    if (chipVal > wallet.balance) return;
    // Validate phase
    if ((type === "pass" || type === "dontpass") && tablePoint !== null) return;
    if ((type === "come" || type === "dontcome") && tablePoint === null) return;
    if (!wallet.subtract(chipVal)) return;

    setBets(prev => {
      const ex = prev.findIndex(b => b.type === type && !b.point);
      if (ex >= 0) {
        const u = [...prev];
        u[ex] = { ...u[ex], amount: u[ex].amount + chipVal };
        return u;
      }
      return [...prev, { type, amount: chipVal }];
    });
    if (phase === "betting") setPhase("comeOut");
  }

  function addOdds(betIndex: number) {
    if (rolling) return;
    const bet = bets[betIndex];
    if (!bet || !bet.point) return;
    const maxOdds = bet.amount * 3;
    const currentOdds = bet.odds || 0;
    const toAdd = Math.min(chipVal, maxOdds - currentOdds);
    if (toAdd <= 0 || toAdd > wallet.balance) return;
    if (!wallet.subtract(toAdd)) return;
    const u = [...bets];
    u[betIndex] = { ...u[betIndex], odds: currentOdds + toAdd };
    setBets(u);
  }

  function roll() {
    if (bets.length === 0 || rolling) return;
    setRolling(true);
    setMsg("");
    setLastWin(0);

    setTimeout(() => {
      const d = rollDice();
      setDice(d);
      setRolling(false);
      const sum = d[0] + d[1];
      setHistory(h => [sum, ...h.slice(0, 9)]);
      resolveRoll(sum);
    }, 800);
  }

  function resolveRoll(sum: number) {
    let newBets = [...bets];
    let totalWin = 0;
    const removals: number[] = [];

    if (tablePoint === null) {
      // Come-out roll for pass/dontpass
      newBets = newBets.map((bet, i) => {
        if (bet.type === "pass") {
          if (sum === 7 || sum === 11) { totalWin += bet.amount * 2; removals.push(i); setMsg("Pass wins! 🎉"); }
          else if (sum === 2 || sum === 3 || sum === 12) { removals.push(i); setMsg("Craps! Pass loses"); }
          else { setTablePoint(sum); setPhase("point"); setMsg(`Point is ${sum}`); return { ...bet, point: sum }; }
        }
        if (bet.type === "dontpass") {
          if (sum === 2 || sum === 3) { totalWin += bet.amount * 2; removals.push(i); setMsg("Don't Pass wins!"); }
          else if (sum === 7 || sum === 11) { removals.push(i); setMsg("Don't Pass loses"); }
          else if (sum === 12) { totalWin += bet.amount; removals.push(i); setMsg("Bar 12 — Push"); }
          else { setTablePoint(sum); setPhase("point"); setMsg(`Point is ${sum}`); return { ...bet, point: sum }; }
        }
        return bet;
      });
    } else {
      // Point phase
      newBets = newBets.map((bet, i) => {
        // Pass line with point
        if (bet.type === "pass" && bet.point) {
          if (sum === bet.point) {
            totalWin += bet.amount * 2;
            if (bet.odds) totalWin += bet.odds + oddsPayoutPass(bet.point, bet.odds);
            removals.push(i);
            setMsg(`Hit the point ${sum}! Pass wins! 🎉`);
            setTablePoint(null); setPhase("comeOut");
          } else if (sum === 7) {
            removals.push(i);
            setMsg("Seven out! Pass loses");
            setTablePoint(null); setPhase("comeOut");
          }
        }
        // Don't pass with point
        if (bet.type === "dontpass" && bet.point) {
          if (sum === 7) {
            totalWin += bet.amount * 2;
            if (bet.odds) totalWin += bet.odds + oddsPayoutDont(bet.point, bet.odds);
            removals.push(i);
            setMsg("Seven out! Don't Pass wins!");
            setTablePoint(null); setPhase("comeOut");
          } else if (sum === bet.point) {
            removals.push(i);
            setMsg(`Point ${sum} hit — Don't Pass loses`);
            setTablePoint(null); setPhase("comeOut");
          }
        }
        // Come bet (no point yet for this bet)
        if (bet.type === "come" && !bet.point) {
          if (sum === 7 || sum === 11) { totalWin += bet.amount * 2; removals.push(i); }
          else if (sum === 2 || sum === 3 || sum === 12) { removals.push(i); }
          else { return { ...bet, point: sum }; }
        }
        // Come bet with point
        if (bet.type === "come" && bet.point) {
          if (sum === bet.point) {
            totalWin += bet.amount * 2;
            if (bet.odds) totalWin += bet.odds + oddsPayoutPass(bet.point, bet.odds);
            removals.push(i);
          } else if (sum === 7) {
            removals.push(i);
          }
        }
        // Don't come (no point)
        if (bet.type === "dontcome" && !bet.point) {
          if (sum === 2 || sum === 3) { totalWin += bet.amount * 2; removals.push(i); }
          else if (sum === 7 || sum === 11) { removals.push(i); }
          else if (sum === 12) { totalWin += bet.amount; removals.push(i); } // push
          else { return { ...bet, point: sum }; }
        }
        // Don't come with point
        if (bet.type === "dontcome" && bet.point) {
          if (sum === 7) {
            totalWin += bet.amount * 2;
            if (bet.odds) totalWin += bet.odds + oddsPayoutDont(bet.point, bet.odds);
            removals.push(i);
          } else if (sum === bet.point) {
            removals.push(i);
          }
        }
        return bet;
      });

      // If seven out, clear all come/dontcome bets too
      if (sum === 7) {
        newBets.forEach((bet, i) => {
          if (bet.type === "come" && bet.point && !removals.includes(i)) removals.push(i);
        });
      }
    }

    if (totalWin > 0) {
      wallet.add(Math.round(totalWin * 100) / 100);
      setLastWin(Math.round(totalWin * 100) / 100);
    }

    // Remove resolved bets
    const finalBets = newBets.filter((_, i) => !removals.includes(i));
    setBets(finalBets);
    if (finalBets.length === 0 && !tablePoint) setPhase("betting");
  }

  const betAreaClass = (active: boolean, disabled: boolean) =>
    `p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer text-center font-bold text-sm ${
      disabled ? "opacity-30 cursor-not-allowed" :
      active ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
    }`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="text-3xl sm:text-4xl font-black text-center mb-6 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
        CRAPS
      </motion.h1>

      {/* Point indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {[4, 5, 6, 8, 9, 10].map(n => (
          <div key={n} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
            ${tablePoint === n ? "border-amber-400 bg-amber-500/20 text-amber-400 scale-110" : "border-white/10 bg-white/5 text-gray-500"}`}>
            {n}
          </div>
        ))}
        <div className={`ml-2 px-3 py-2 rounded-full text-xs font-bold ${tablePoint ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-gray-800 text-gray-500 border border-white/10"}`}>
          {tablePoint ? "ON" : "OFF"}
        </div>
      </div>

      {/* Table + Dice */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-white/10 p-4 sm:p-6 mb-6"
        style={{ background: "linear-gradient(135deg, #1a0505, #2a0a0a, #1a0505)" }}>

        {/* Dice */}
        <div className="flex justify-center gap-4 mb-6">
          <DieComp value={dice[0]} rolling={rolling} />
          <DieComp value={dice[1]} rolling={rolling} />
        </div>

        {/* Sum + Message */}
        {!rolling && (
          <div className="text-center mb-4">
            <div className="text-2xl font-black text-white">{total}</div>
          </div>
        )}
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-3 mb-4 rounded-xl bg-black/40 border border-amber-500/30 text-amber-400 font-bold">{msg}</motion.div>
          )}
        </AnimatePresence>

        {lastWin > 0 && (
          <div className="text-center text-green-400 font-bold mb-4">Won ${lastWin.toFixed(2)}</div>
        )}

        {/* Betting areas */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div onClick={() => !tablePoint && placeBet("pass")}
            className={betAreaClass(!!hasBet("pass"), !!tablePoint)}>
            PASS LINE
            {hasBet("pass") && <div className="text-amber-400 text-xs mt-1">${hasBet("pass")!.amount}</div>}
          </div>
          <div onClick={() => !tablePoint && placeBet("dontpass")}
            className={betAreaClass(!!hasBet("dontpass"), !!tablePoint)}>
            DON'T PASS
            {hasBet("dontpass") && <div className="text-amber-400 text-xs mt-1">${hasBet("dontpass")!.amount}</div>}
          </div>
          <div onClick={() => tablePoint !== null && placeBet("come")}
            className={betAreaClass(!!hasBet("come"), !tablePoint)}>
            COME
            {bets.filter(b => b.type === "come").map((b, i) => (
              <div key={i} className="text-amber-400 text-xs">${b.amount}{b.point ? ` → ${b.point}` : ""}</div>
            ))}
          </div>
          <div onClick={() => tablePoint !== null && placeBet("dontcome")}
            className={betAreaClass(!!hasBet("dontcome"), !tablePoint)}>
            DON'T COME
            {bets.filter(b => b.type === "dontcome").map((b, i) => (
              <div key={i} className="text-amber-400 text-xs">${b.amount}{b.point ? ` → ${b.point}` : ""}</div>
            ))}
          </div>
        </div>

        {/* Odds buttons */}
        {bets.some(b => b.point) && (
          <div className="mb-4 space-y-2">
            <div className="text-xs text-gray-400 text-center">Add Odds (max 3× bet)</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {bets.map((bet, i) => bet.point ? (
                <button key={i} onClick={() => addOdds(i)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-all">
                  {bet.type} {bet.point} odds {bet.odds ? `($${bet.odds})` : ""}
                </button>
              ) : null)}
            </div>
          </div>
        )}
      </motion.div>

      {/* Chip selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {[5, 10, 25, 100, 500].map(v => (
          <button key={v} onClick={() => setChipVal(v)}
            className={`w-12 h-12 rounded-full font-bold text-xs border-2 transition-all ${chipVal === v ? "border-red-400 bg-red-500/20 text-red-400 scale-110" : "border-white/20 bg-white/5 text-gray-300 hover:border-white/40"}`}>${v}</button>
        ))}
      </div>

      {/* Roll button */}
      <div className="text-center mb-4">
        <motion.button whileTap={{ scale: 0.95 }} onClick={roll} disabled={bets.length === 0 || rolling}
          className="px-12 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-black text-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {rolling ? "Rolling..." : "🎲 ROLL"}
        </motion.button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {history.map((h, i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-white/10
              ${h === 7 ? "bg-red-600" : h === 11 ? "bg-green-600" : [2,3,12].includes(h) ? "bg-gray-700" : "bg-white/10"}`}>{h}</div>
          ))}
        </div>
      )}
    </div>
  );
}
