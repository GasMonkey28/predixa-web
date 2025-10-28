import { useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

interface AttractiveChartSectionProps {
  data: Array<{ time: string; price: number }>;
}

export function AttractiveChartSection({ data }: AttractiveChartSectionProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 backdrop-blur-sm">
          <p className="text-zinc-400 mb-1">{payload[0].payload.time}</p>
          <p className="text-cyan-400">
            ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-zinc-200">Intraday Price Chart</h3>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded-lg transition-all ${
                chartType === 'line'
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 rounded-lg transition-all ${
                chartType === 'area'
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Area Chart
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={data}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis 
                  dataKey="time" 
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                />
                <YAxis 
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="url(#lineGradient)"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={1000}
                />
              </LineChart>
            ) : (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis 
                  dataKey="time" 
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                />
                <YAxis 
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  animationDuration={1000}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

