import { motion } from "framer-motion";
import { GAMES } from "../lib/games";

export default function LobbyPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative py-16 sm:py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 via-transparent to-transparent" />
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="relative z-10">
          <div className="inline-block px-4 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-4">
            🎰 12,847 Players Online
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-3">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">ROYALE CASINO</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">Premium gaming experience — where fortune favors the bold</p>
        </motion.div>
        {/* Jackpot */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-8 inline-block px-6 py-3 rounded-2xl border border-amber-500/20 bg-black/40" style={{ backdropFilter: "blur(12px)" }}>
          <div className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">Progressive Jackpot</div>
          <div className="text-3xl font-black text-amber-400">$2,847,293</div>
        </motion.div>
      </motion.section>

      {/* Game Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.map((game, i) => (
            <motion.div key={game.slug}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i, duration: 0.5 }}
              whileHover={{ scale: 1.03, y: -4 }}
              onClick={() => onNavigate(`/games/${game.slug}`)}
              className="group relative cursor-pointer rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(8px)" }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ boxShadow: `inset 0 0 40px ${game.accent}20, 0 0 30px ${game.accent}15` }} />
              {/* Thumbnail */}
              <div className={`h-40 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${game.accent}, transparent 70%)` }} />
                <span className="text-5xl font-black text-white/20 group-hover:text-white/30 transition-all group-hover:scale-110 duration-500">
                  {game.title.charAt(0)}
                </span>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/40 text-xs text-green-400 border border-green-500/20">
                  ● LIVE
                </div>
              </div>
              {/* Info */}
              <div className="p-5">
                <h3 className="text-xl font-bold mb-1">{game.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{game.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{game.players.toLocaleString()} playing</span>
                  <span>${game.minBet}–${game.maxBet.toLocaleString()}</span>
                </div>
                <button className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accent}99)`, color: "#000" }}>
                  Enter Game
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
