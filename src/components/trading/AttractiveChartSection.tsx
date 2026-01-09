import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import { useMemo } from 'react';
import React from 'react';
import CandlestickChart from '@/components/charts/CandlestickChart';
import { getWeekDateRange } from '@/lib/trading-calendar';

interface WeeklyPrediction {
  ticker: string
  as_of_date: string
  fwd_join_date: string
  baseline_week_close: number
  t_close_to_pre: number
  t_lowest_to_close: number
  t_highest_to_pre: number
}

interface WeeklyPredictions {
  currentWeek: WeeklyPrediction | null
  previousWeek: WeeklyPrediction | null
  allWeeks?: WeeklyPrediction[]
}

interface AttractiveChartSectionProps {
  data: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>;
  chartType: 'line' | 'candlestick';
  onChartTypeChange: (type: 'line' | 'candlestick') => void;
  title?: string;
  height?: number;
  weeklyPredictions?: WeeklyPredictions;
  interval?: '15min' | '60min';
  onIntervalChange?: (interval: '15min' | '60min') => void;
}

function AttractiveChartSection({ data, chartType, onChartTypeChange, title = 'Price Chart', height = 320, weeklyPredictions, interval = '15min', onIntervalChange }: AttractiveChartSectionProps) {
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

  // Prepare data with prediction lines for LineChart
  const chartDataWithPredictions = useMemo(() => {
    // Check if we have any predictions
    const hasPredictions = weeklyPredictions && (
      weeklyPredictions.currentWeek || 
      weeklyPredictions.previousWeek || 
      (weeklyPredictions.allWeeks && weeklyPredictions.allWeeks.length > 0)
    )
    
    if (!hasPredictions) {
      return data;
    }

    // Helper to get date string in ET timezone (YYYY-MM-DD)
    const getETDateString = (date: Date): string => {
      const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const year = etDate.getFullYear()
      const month = String(etDate.getMonth() + 1).padStart(2, '0')
      const day = String(etDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Map predictions to data points based on date ranges
    return data.map((point: any) => {
      // Use timestamp if available, otherwise parse the time string
      const pointDate = point.timestamp ? new Date(point.timestamp) : new Date(point.time);
      const pointDateStr = getETDateString(pointDate);
      
      const result: any = { ...point };
      
      // Check if point falls within current week's range
      if (weeklyPredictions.currentWeek) {
        // Parse fwd_join_date as ET timezone (format: "2026-01-02")
        const fwdJoinDateStr = weeklyPredictions.currentWeek.fwd_join_date;
        const [year, month, day] = fwdJoinDateStr.split('-').map(Number);
        const fridayDate = new Date();
        fridayDate.setFullYear(year, month - 1, day);
        fridayDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
        
        const { monday, friday } = getWeekDateRange(fridayDate);
        const mondayStr = getETDateString(monday);
        const fridayStr = getETDateString(friday);
        
        if (pointDateStr >= mondayStr && pointDateStr <= fridayStr) {
          result.currentWeek_close = weeklyPredictions.currentWeek.t_close_to_pre;
          result.currentWeek_low = weeklyPredictions.currentWeek.t_lowest_to_close;
          result.currentWeek_high = weeklyPredictions.currentWeek.t_highest_to_pre;
        }
      }
      
      // Check if point falls within previous week's range
      if (weeklyPredictions.previousWeek) {
        // Parse fwd_join_date as ET timezone (format: "2026-01-02")
        const fwdJoinDateStr = weeklyPredictions.previousWeek.fwd_join_date;
        const [year, month, day] = fwdJoinDateStr.split('-').map(Number);
        const fridayDate = new Date();
        fridayDate.setFullYear(year, month - 1, day);
        fridayDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
        
        const { monday, friday } = getWeekDateRange(fridayDate);
        const mondayStr = getETDateString(monday);
        const fridayStr = getETDateString(friday);
        
        // Include bars that fall within the week range (works for partial weeks)
        // e.g., if only Friday is visible, it will still match and show lines
        if (pointDateStr >= mondayStr && pointDateStr <= fridayStr) {
          result.previousWeek_close = weeklyPredictions.previousWeek.t_close_to_pre;
          result.previousWeek_low = weeklyPredictions.previousWeek.t_lowest_to_close;
          result.previousWeek_high = weeklyPredictions.previousWeek.t_highest_to_pre;
        }
      }
      
      // Check if point falls within any of the allWeeks ranges (60min interval)
      if (weeklyPredictions.allWeeks && weeklyPredictions.allWeeks.length > 0) {
        for (let i = 0; i < weeklyPredictions.allWeeks.length; i++) {
          const weekPrediction = weeklyPredictions.allWeeks[i]
          // Skip if this is already covered by currentWeek or previousWeek
          if (
            (weeklyPredictions.currentWeek && weekPrediction.fwd_join_date === weeklyPredictions.currentWeek.fwd_join_date) ||
            (weeklyPredictions.previousWeek && weekPrediction.fwd_join_date === weeklyPredictions.previousWeek.fwd_join_date)
          ) {
            continue
          }
          
          // Parse fwd_join_date as ET timezone (format: "2026-01-02")
          const fwdJoinDateStr = weekPrediction.fwd_join_date
          const [year, month, day] = fwdJoinDateStr.split('-').map(Number)
          const fridayDate = new Date()
          fridayDate.setFullYear(year, month - 1, day)
          fridayDate.setHours(12, 0, 0, 0) // Noon to avoid timezone issues
          
          const { monday, friday } = getWeekDateRange(fridayDate)
          const mondayStr = getETDateString(monday)
          const fridayStr = getETDateString(friday)
          
          if (pointDateStr >= mondayStr && pointDateStr <= fridayStr) {
            // Use unique keys for each week
            result[`week_${i}_close`] = weekPrediction.t_close_to_pre
            result[`week_${i}_low`] = weekPrediction.t_lowest_to_close
            result[`week_${i}_high`] = weekPrediction.t_highest_to_pre
          }
        }
      }
      
      return result;
    });
  }, [data, weeklyPredictions]);

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
            <h3 className="text-zinc-200">{title}</h3>
          </div>
          
          <div className="flex gap-2">
            {/* Interval Toggle */}
            {onIntervalChange && (
              <>
                <button
                  onClick={() => onIntervalChange('15min')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    interval === '15min'
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  15min
                </button>
                <button
                  onClick={() => onIntervalChange('60min')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    interval === '60min'
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  60min
                </button>
              </>
            )}
            
            {/* Chart Type Toggle */}
            <button
              onClick={() => onChartTypeChange('line')}
              className={`px-3 py-1 rounded-lg transition-all ${
                chartType === 'line'
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => onChartTypeChange('candlestick')}
              className={`px-3 py-1 rounded-lg transition-all ${
                chartType === 'candlestick'
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Candlestick
            </button>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: `${height}px` }}>
          {chartType === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataWithPredictions}>
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
                  dataKey="close" 
                  stroke="url(#lineGradient)"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={1000}
                />
                {/* Current Week Prediction Lines */}
                {weeklyPredictions?.currentWeek && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="currentWeek_close" 
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeOpacity={0.8}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="currentWeek_low" 
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeOpacity={0.8}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="currentWeek_high" 
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeOpacity={0.8}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </>
                )}
                {/* Previous Week Prediction Lines */}
                {weeklyPredictions?.previousWeek && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="previousWeek_close" 
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                      dot={false}
                      strokeDasharray="3 3"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="previousWeek_low" 
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                      dot={false}
                      strokeDasharray="3 3"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="previousWeek_high" 
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                      dot={false}
                      strokeDasharray="3 3"
                    />
                  </>
                )}
                {/* All Weeks Prediction Lines (60min interval) */}
                {weeklyPredictions?.allWeeks && weeklyPredictions.allWeeks.map((weekPrediction, index) => {
                  // Skip if this is already covered by currentWeek or previousWeek
                  if (
                    (weeklyPredictions.currentWeek && weekPrediction.fwd_join_date === weeklyPredictions.currentWeek.fwd_join_date) ||
                    (weeklyPredictions.previousWeek && weekPrediction.fwd_join_date === weeklyPredictions.previousWeek.fwd_join_date)
                  ) {
                    return null
                  }
                  
                  return (
                    <React.Fragment key={`all-week-${weekPrediction.fwd_join_date}`}>
                      <Line 
                        type="monotone" 
                        dataKey={`week_${index}_close`}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        strokeOpacity={0.4}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                      <Line 
                        type="monotone" 
                        dataKey={`week_${index}_low`}
                        stroke="#10b981"
                        strokeWidth={1.5}
                        strokeOpacity={0.4}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                      <Line 
                        type="monotone" 
                        dataKey={`week_${index}_high`}
                        stroke="#ef4444"
                        strokeWidth={1.5}
                        strokeOpacity={0.4}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                    </React.Fragment>
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
          <CandlestickChart 
            data={data.map(d => ({
              time: d.time,
              timestamp: (d as any).timestamp, // Pass through timestamp if available
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume
            }))} 
            height={height}
            weeklyPredictions={weeklyPredictions}
          />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AttractiveChartSection;

