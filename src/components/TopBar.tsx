import { useWallet } from '../context/WalletContext';
import { motion } from 'framer-motion';

interface Props {
  onNavigate: (path: string) => void;
  currentPath: string;
}

export default function TopBar({ onNavigate, currentPath }: Props) {
  const { balance, add } = useWallet();
  const isGame = currentPath.startsWith('/games/');

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 glass-strong"
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('/')} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
              <span className="text-black font-black text-sm">R</span>
            </div>
            <span className="font-display text-xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent hidden sm:block">
              ROYALE
            </span>
          </button>
          {isGame && (
            <button
              onClick={() => onNavigate('/')}
              className="ml-2 text-sm text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              Lobby
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
            <span className="text-xs text-white/40 uppercase tracking-wider hidden sm:block">Balance</span>
            <span className="text-amber-400 font-bold text-lg">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => add(500)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-shadow"
          >
            +$500
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border-2 border-amber-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-400">VIP</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
