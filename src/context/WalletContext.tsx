import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface WalletCtx {
  balance: number;
  add: (n: number) => void;
  subtract: (n: number) => boolean;
  setBalance: (n: number) => void;
}

const Ctx = createContext<WalletCtx>({ balance: 1000, add: () => {}, subtract: () => false, setBalance: () => {} });

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBal] = useState(1000);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('casino_balance');
    if (s) { const n = parseFloat(s); if (!isNaN(n) && n >= 0) setBal(n); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem('casino_balance', balance.toString());
  }, [balance, loaded]);

  const add = (n: number) => setBal(p => Math.round((p + n) * 100) / 100);
  const subtract = (n: number) => {
    if (balance < n) return false;
    setBal(p => Math.round((p - n) * 100) / 100);
    return true;
  };
  const setBalance = (n: number) => setBal(Math.max(0, Math.round(n * 100) / 100));

  return <Ctx.Provider value={{ balance, add, subtract, setBalance }}>{children}</Ctx.Provider>;
}

export const useWallet = () => useContext(Ctx);
