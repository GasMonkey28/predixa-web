import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Zap, Shield, AlertTriangle, Info } from 'lucide-react';

interface AttractiveRecommendationCardProps {
  action: 'BUY' | 'SELL' | 'HOLD';
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  score: number;
  confidence: string;
  riskLevel: string;
  reasoning: string;
  keyPoints: string[];
}

const tierConfig = {
  S: { 
    label: 'S-Tier', 
    description: 'Exceptional Signal',
    bg: 'from-purple-600 to-pink-600', 
    glow: 'bg-purple-500', 
    text: 'text-purple-300', 
    border: 'border-purple-500',
    strength: 5
  },
  A: { 
    label: 'A-Tier', 
    description: 'Strong Signal',
    bg: 'from-blue-600 to-cyan-600', 
    glow: 'bg-cyan-500', 
    text: 'text-cyan-300', 
    border: 'border-cyan-500',
    strength: 4
  },
  B: { 
    label: 'B-Tier', 
    description: 'Moderate Signal',
    bg: 'from-emerald-600 to-green-600', 
    glow: 'bg-emerald-500', 
    text: 'text-emerald-300', 
    border: 'border-emerald-500',
    strength: 3
  },
  C: { 
    label: 'C-Tier', 
    description: 'Weak Signal',
    bg: 'from-amber-600 to-orange-600', 
    glow: 'bg-amber-500', 
    text: 'text-amber-300', 
    border: 'border-amber-500',
    strength: 2
  },
  D: { 
    label: 'D-Tier', 
    description: 'Very Weak Signal',
    bg: 'from-gray-600 to-gray-700', 
    glow: 'bg-gray-500', 
    text: 'text-gray-400', 
    border: 'border-gray-500',
    strength: 1
  },
};

export function AttractiveRecommendationCard({ 
  action, 
  tier, 
  score, 
  confidence, 
  riskLevel, 
  reasoning,
  keyPoints 
}: AttractiveRecommendationCardProps) {
  const tierData = tierConfig[tier];
  const isBuy = action === 'BUY';
  const isHold = action === 'HOLD';

  const actionColors = {
    BUY: 'from-emerald-500 to-green-500',
    SELL: 'from-red-500 to-rose-500',
    HOLD: 'from-zinc-600 to-zinc-700',
  };

  const actionGlow = {
    BUY: 'bg-emerald-500',
    SELL: 'bg-red-500',
    HOLD: 'bg-zinc-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-zinc-800 p-8"
    >
      {/* Glow effects */}
      <div className={`absolute top-0 left-0 w-full h-1/2 ${actionGlow[action]} opacity-10 blur-3xl`} />
      <div className={`absolute bottom-0 right-0 w-1/2 h-1/2 ${tierData.glow} opacity-10 blur-3xl`} />
      
      <div className="relative z-10">
        {/* Info tooltip */}
        <div className="absolute top-0 right-0 group">
          <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-help">
            <Info className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="absolute top-full right-0 mt-2 w-64 p-4 rounded-lg bg-zinc-900 border border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl">
            <div className="mb-2">Signal Strength:</div>
            <ul className="space-y-1 text-zinc-400">
              <li className="text-purple-400">• S-Tier: Exceptional (90%+)</li>
              <li className="text-cyan-400">• A-Tier: Strong (75-89%)</li>
              <li className="text-emerald-400">• B-Tier: Moderate (60-74%)</li>
              <li className="text-amber-400">• C-Tier: Weak (45-59%)</li>
              <li className="text-gray-400">• D-Tier: Very Weak (below 45%)</li>
            </ul>
          </div>
        </div>

        {/* Main Action Display */}
        <div className="text-center mb-8">
          <div className="text-zinc-400 mb-4">Today&apos;s Recommendation</div>
          
          {/* Giant Action Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`relative inline-block mb-6`}
          >
            <div className={`absolute inset-0 ${actionGlow[action]} opacity-30 blur-2xl`} />
            <div className={`relative px-16 py-8 rounded-2xl bg-gradient-to-r ${actionColors[action]} shadow-2xl`}>
              <div className="flex items-center gap-4">
                {isBuy ? (
                  <TrendingUp className="w-12 h-12 text-white" />
                ) : isHold ? (
                  <AlertTriangle className="w-12 h-12 text-white" />
                ) : (
                  <TrendingDown className="w-12 h-12 text-white" />
                )}
                <div>
                  <div className="text-white/80 text-left mb-1">Action</div>
                  <div className="text-white text-left">{action}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tier Badge */}
          <div className="flex items-center justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className={`relative px-8 py-4 rounded-xl bg-gradient-to-r ${tierData.bg} shadow-lg`}
            >
              <div className={`absolute inset-0 ${tierData.glow} opacity-50 blur-xl`} />
              <div className="relative z-10">
                <div className="text-white/80 mb-1">Signal Strength</div>
                <div className="flex items-center gap-3">
                  <span className="text-white">{tierData.label}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-6 rounded-full ${
                          i < tierData.strength ? 'bg-white' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-white/60 text-sm mt-1">{tierData.description}</div>
              </div>
            </motion.div>

            <div className={`px-6 py-4 rounded-xl bg-zinc-800/80 border ${tierData.border}`}>
              <div className="text-zinc-400 mb-1">Confidence Score</div>
              <div className={`${tierData.text}`}>{score.toFixed(1)}/10</div>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="mb-6 p-5 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-400 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span>Why {action}?</span>
          </div>
          <div className="text-zinc-200">{reasoning}</div>
        </div>

        {/* Key Points */}
        <div className="mb-6">
          <div className="text-zinc-400 mb-3">Key Points</div>
          <div className="space-y-2">
            {keyPoints.map((point, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50"
              >
                <span className={`${tierData.text} mt-1`}>•</span>
                <span className="text-zinc-300 flex-1">{point}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Shield className="w-5 h-5" />
              <span>Confidence Level</span>
            </div>
            <div className="text-blue-300">{confidence}</div>
          </div>
          
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Risk Assessment</span>
            </div>
            <div className="text-orange-300">{riskLevel}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

