import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

interface AttractivePriceCardProps {
  price: number;
  change: number;
  changePercent: number;
  onRefresh?: () => void;
}

function AttractivePriceCard({ price, change, changePercent, onRefresh }: AttractivePriceCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6 w-full"
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 opacity-20 blur-3xl ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-zinc-400 mb-2">
          <span>SPY</span>
        </div>
        
        <div>
          <div className={`text-3xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'} mb-2`}>
            ${price.toFixed(2)}
          </div>
          <div className={`flex items-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>
              {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default AttractivePriceCard;

