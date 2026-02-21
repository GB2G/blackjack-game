import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletProvider } from './context/WalletContext';
import TopBar from './components/TopBar';
import LobbyPage from './pages/LobbyPage';

const BlackjackGame = lazy(() => import('./games/blackjack/BlackjackGame'));
const RouletteGame = lazy(() => import('./games/roulette/RouletteGame'));
const SlotsGame = lazy(() => import('./games/slots/SlotsGame'));
const BaccaratGame = lazy(() => import('./games/baccarat/BaccaratGame'));
const CrapsGame = lazy(() => import('./games/craps/CrapsGame'));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full" />
    </div>
  );
}

function GameNotFound({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h2 className="font-display text-4xl font-black text-white/80">Game Not Found</h2>
      <p className="text-white/40">This game doesn't exist or is coming soon.</p>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => onNavigate('/')}
        className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow-lg shadow-amber-500/20">
        Back to Lobby
      </motion.button>
    </div>
  );
}

function GameRouter({ slug, onNavigate }: { slug: string; onNavigate: (p: string) => void }) {
  switch (slug) {
    case 'blackjack': return <Suspense fallback={<Loading />}><BlackjackGame /></Suspense>;
    case 'roulette': return <Suspense fallback={<Loading />}><RouletteGame /></Suspense>;
    case 'slots': return <Suspense fallback={<Loading />}><SlotsGame /></Suspense>;
    case 'baccarat': return <Suspense fallback={<Loading />}><BaccaratGame /></Suspense>;
    case 'craps': return <Suspense fallback={<Loading />}><CrapsGame /></Suspense>;
    default: return <GameNotFound onNavigate={onNavigate} />;
  }
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);

  const navigate = useCallback((newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const isGame = path.startsWith('/games/');
  const slug = isGame ? path.replace('/games/', '').replace(/\/$/, '') : '';

  return (
    <WalletProvider>
      <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/[0.02] blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/[0.02] blur-[120px]" />
        </div>

        <div className="relative z-10">
          <TopBar onNavigate={navigate} currentPath={path} />
          <AnimatePresence mode="wait">
            <motion.div
              key={path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' as const }}
            >
              {isGame ? (
                <GameRouter slug={slug} onNavigate={navigate} />
              ) : (
                <LobbyPage onNavigate={navigate} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </WalletProvider>
  );
}
