import { motion } from 'framer-motion';
import { GAMES } from '../lib/games';

interface Props { onNavigate: (path: string) => void; }

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

export default function LobbyPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-16 sm:py-24 text-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 via-transparent to-transparent" />
        <div className="relative z-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <span className="inline-block px-4 py-1.5 rounded-full glass text-amber-400 text-xs font-semibold tracking-wider uppercase mb-6">
              ✦ Premium Gaming Experience ✦
            </span>
          </motion.div>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-display text-5xl sm:text-7xl font-black mb-4"
          >
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              ROYALE CASINO
            </span>
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-white/40 text-lg max-w-md mx-auto"
          >
            Five premium games. One legendary experience.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex justify-center gap-8 mt-8 text-sm"
          >
            {[['10K+', 'Players Online'], ['$2.4M', 'Won Today'], ['99.7%', 'Payout Rate']].map(([v, l]) => (
              <div key={l}>
                <div className="text-amber-400 font-bold text-xl">{v}</div>
                <div className="text-white/30">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Game Grid */}
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {GAMES.map((g) => (
            <motion.div key={g.slug} variants={item}>
              <motion.div
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(`/games/${g.slug}`)}
                className="glass rounded-2xl overflow-hidden cursor-pointer group relative"
                style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.06)` }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ boxShadow: `0 0 30px ${g.accent}33, inset 0 0 30px ${g.accent}11` }}
                />
                {/* Thumbnail */}
                <div className={`h-40 bg-gradient-to-br ${g.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-display font-black text-white/10">{g.title[0]}</span>
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/60 text-xs">{g.players.toLocaleString()} playing</span>
                  </div>
                  <div className="absolute top-3 right-3 glass rounded-lg px-2 py-1 text-xs text-white/70">
                    Min ${g.minBet}
                  </div>
                </div>
                {/* Info */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-white mb-1">{g.title}</h3>
                  <p className="text-white/40 text-sm mb-4">{g.desc}</p>
                  <div
                    className="w-full py-2.5 rounded-xl text-center font-bold text-sm transition-all duration-300"
                    style={{ background: `${g.accent}22`, color: g.accent, border: `1px solid ${g.accent}33` }}
                  >
                    Play Now
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-4 mt-20 pt-8 border-t border-white/5 text-center text-white/20 text-xs">
        <p>© 2024 Royale Casino — For entertainment purposes only. Not real gambling.</p>
      </div>
    </div>
  );
}
