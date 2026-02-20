import { useWallet } from "../context/WalletContext";
import { motion } from "framer-motion";

export default function TopBar({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { balance, add } = useWallet();
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10"
      style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(16px)" }}
    >
      <button onClick={() => onNavigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-sm">R</div>
        <span className="text-lg font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent hidden sm:block">ROYALE</span>
      </button>
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm">
          <span className="text-gray-400 mr-1">$</span>
          <span className="font-semibold text-amber-400">{balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
        <button onClick={() => add(500)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold hover:brightness-110 transition-all active:scale-95">
          +$500
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">VIP</div>
      </div>
    </motion.header>
  );
}
