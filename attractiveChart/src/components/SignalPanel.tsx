import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Zap, Shield, AlertTriangle } from 'lucide-react';

interface SignalData {
  type: 'LONG' | 'SHORT';
  tier: 'S' | 'A' | 'B' | 'C';
  score: number;
  rating: string;
  confidence: string;
  riskLevel: string;
  summary: string;
  suggestions: string[];
}

interface SignalPanelProps {
  signal: SignalData;
}

const tierColors = {
  S: { bg: 'from-purple-600 to-pink-600', glow: 'bg-purple-500', text: 'text-purple-300', border: 'border-purple-500' },
  A: { bg: 'from-blue-600 to-cyan-600', glow: 'bg-cyan-500', text: 'text-cyan-300', border: 'border-cyan-500' },
  B: { bg: 'from-emerald-600 to-green-600', glow: 'bg-emerald-500', text: 'text-emerald-300', border: 'border-emerald-500' },
  C: { bg: 'from-amber-600 to-orange-600', glow: 'bg-amber-500', text: 'text-amber-300', border: 'border-amber-500' },
};

export function SignalPanel({ signal }: SignalPanelProps) {
  const isLong = signal.type === 'LONG';
  const colors = tierColors[signal.tier];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6"
    >
      {/* Animated gradient border effect */}
      <div className={`absolute inset-0 opacity-10 bg-gradient-to-r ${colors.bg}`} />
      
      <div className="relative z-10">
        {/* Header with Tier Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={`relative px-4 py-2 rounded-xl bg-gradient-to-r ${colors.bg} shadow-lg`}
            >
              <div className={`absolute inset-0 ${colors.glow} opacity-50 blur-xl`} />
              <span className="relative z-10 font-mono">
                TIER {signal.tier}
              </span>
            </motion.div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isLong ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'}`}>
              {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{signal.type}</span>
            </div>
          </div>
          
          <div className={`${colors.text}`}>
            Score: {signal.score.toFixed(1)}
          </div>
        </div>

        {/* Signal Rating */}
        <div className={`mb-4 p-4 rounded-xl ${isLong ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className="text-zinc-400 mb-1">Rating</div>
          <div>{signal.rating}</div>
        </div>

        {/* Summary */}
        <div className="mb-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="text-zinc-400 mb-2">Summary</div>
          <div className="text-blue-300">{signal.summary}</div>
        </div>

        {/* Suggestions */}
        <div className="mb-4">
          <div className="text-zinc-400 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Suggestions
          </div>
          <ul className="space-y-2">
            {signal.suggestions.map((suggestion, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-2 text-zinc-300"
              >
                <span className="text-cyan-400 mt-1">•</span>
                <span>{suggestion}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Bottom Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Shield className="w-4 h-4" />
              <span>Confidence</span>
            </div>
            <div className="text-amber-300">{signal.confidence}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 text-orange-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Risk Level</span>
            </div>
            <div className="text-orange-300">{signal.riskLevel}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
