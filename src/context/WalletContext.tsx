import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface WalletCtx {
  balance: number;
  add: (n: number) => void;
  subtract: (n: number) => boolean;
  set: (n: number) => void;
}

const Ctx = createContext<WalletCtx>({ balance: 1000, add: () => {}, subtract: () => false, set: () => {} });

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(1000);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("casino_balance");
    if (s) { const n = parseFloat(s); if (!isNaN(n) && n >= 0) setBalance(n); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("casino_balance", balance.toString());
  }, [balance, loaded]);

  const add = (n: number) => setBalance(b => Math.round((b + n) * 100) / 100);
  const subtract = (n: number) => {
    if (n > balance) return false;
    setBalance(b => Math.round((b - n) * 100) / 100);
    return true;
  };
  const set = (n: number) => setBalance(Math.max(0, Math.round(n * 100) / 100));

  return <Ctx.Provider value={{ balance, add, subtract, set }}>{children}</Ctx.Provider>;
}

export const useWallet = () => useContext(Ctx);
