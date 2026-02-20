import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WalletProvider } from "./context/WalletContext";
import TopBar from "./components/TopBar";
import LobbyPage from "./pages/LobbyPage";
import BlackjackGame from "./games/blackjack/BlackjackGame";
import RouletteGame from "./games/roulette/RouletteGame";
import SlotsGame from "./games/slots/SlotsGame";
import BaccaratGame from "./games/baccarat/BaccaratGame";
import CrapsGame from "./games/craps/CrapsGame";
import { getGame } from "./lib/games";

function getPath() {
  return window.location.pathname || "/";
}

function GameRouter({ slug, onNavigate }: { slug: string; onNavigate: (p: string) => void }) {
  const game = getGame(slug);
  if (!game) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-gray-400">Game not found</h2>
      <button onClick={() => onNavigate("/")} className="mt-4 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all">Back to Lobby</button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <button onClick={() => onNavigate("/")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <span>←</span> <span>Back to Lobby</span>
        </button>
      </div>
      {slug === "blackjack" && <BlackjackGame />}
      {slug === "roulette" && <RouletteGame />}
      {slug === "slots" && <SlotsGame />}
      {slug === "baccarat" && <BaccaratGame />}
      {slug === "craps" && <CrapsGame />}
    </div>
  );
}

export function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const navigate = (p: string) => {
    window.history.pushState({}, "", p);
    setPath(p);
    window.scrollTo(0, 0);
  };

  const slugMatch = path.match(/^\/games\/(.+)$/);
  const slug = slugMatch ? slugMatch[1] : null;

  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-5 blur-3xl bg-amber-500" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-5 blur-3xl bg-blue-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-3 blur-3xl bg-purple-500" />
        </div>

        <div className="relative z-10">
          <TopBar onNavigate={navigate} />
          <AnimatePresence mode="wait">
            <motion.div key={path}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {slug ? (
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
