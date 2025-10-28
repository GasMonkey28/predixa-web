import { useState } from 'react';
import { PriceCard } from './components/PriceCard';
import { RecommendationCard } from './components/RecommendationCard';
import { ChartSection } from './components/ChartSection';
import { EconomicCalendar } from './components/EconomicCalendar';
import { BarChart3, Calendar, Sparkles, TrendingUp, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  // Mock data - replace with real data from your API
  const priceData = {
    price: 672.30,
    change: 0.05,
    changePercent: 0.01,
  };

  // Single recommendation - either BUY or SELL with tier strength
  const recommendation = {
    action: 'BUY' as const,  // Can be 'BUY', 'SELL', or 'HOLD'
    tier: 'A' as const,      // Signal strength: S (best) to D (worst)
    score: 8.5,
    confidence: 'High',
    riskLevel: 'Low-Medium',
    reasoning: 'Strong bullish signals detected across multiple indicators. Price action shows sustained upward momentum with strong volume support.',
    keyPoints: [
      'Price trending above key moving averages with strong momentum',
      'Volume analysis suggests institutional accumulation',
      'Technical indicators showing bullish divergence',
      'Economic calendar supports positive outlook',
    ],
  };

  // Generate mock chart data
  const chartData = Array.from({ length: 50 }, (_, i) => {
    const basePrice = 667 + Math.random() * 6;
    const hour = 7 + Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return {
      time: `${hour}:${minute.toString().padStart(2, '0')}`,
      price: basePrice,
    };
  });

  const economicEvents = [
    {
      time: '08:30',
      title: 'Consumer Price Index (CPI)',
      actual: '3.2%',
      forecast: '3.1%',
      previous: '3.0%',
      impact: 'high' as const,
    },
    {
      time: '10:00',
      title: 'Consumer Sentiment Index',
      forecast: '68.5',
      previous: '67.2',
      impact: 'medium' as const,
    },
    {
      time: '14:00',
      title: 'Federal Reserve Chair Speech',
      actual: 'Dovish tone',
      impact: 'high' as const,
    },
  ];

  const [activeTab, setActiveTab] = useState<'weekly' | 'daily' | 'future'>('daily');

  return (
    <div className="min-h-screen bg-black dark">
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Predixa
                </span>
              </motion.div>

              {/* Navigation */}
              <nav className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('weekly')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'weekly'
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Weekly
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('daily')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'daily'
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Daily
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('future')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'future'
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Future
                </motion.button>
              </nav>

              {/* Account */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                <User className="w-4 h-4" />
                Account
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Title Section */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Daily Analysis
            </h1>
            <p className="text-zinc-500">Trading Analytics</p>
          </motion.div>

          {/* Price Card */}
          <div className="mb-6">
            <PriceCard {...priceData} />
          </div>

          {/* Main Recommendation */}
          <div className="mb-6">
            <RecommendationCard {...recommendation} />
          </div>

          {/* Chart and Calendar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <ChartSection data={chartData} />
            </div>
            <div>
              <EconomicCalendar events={economicEvents} date="2025-10-23" />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 bg-zinc-950/50 backdrop-blur-xl mt-12">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <p className="text-center text-zinc-500">
              Educational content only - NOT financial advice. Trading involves risk.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
