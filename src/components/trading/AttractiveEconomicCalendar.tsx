import { motion } from 'motion/react';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

interface EconomicEvent {
  time: string;
  title: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  impact: 'low' | 'medium' | 'high';
}

interface AttractiveEconomicCalendarProps {
  events?: EconomicEvent[];
  date?: string;
}

function AttractiveEconomicCalendar({ events = [], date = new Date().toISOString().split('T')[0] }: AttractiveEconomicCalendarProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'medium':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
      case 'low':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
      default:
        return 'bg-zinc-500/20 border-zinc-500/50 text-zinc-400';
    }
  };

  // Sample events if none provided
  const sampleEvents: EconomicEvent[] = events.length > 0 ? events : [
    {
      time: '09:30',
      currency: 'USD',
      event: 'Non-Farm Payrolls',
      forecast: '200K',
      previous: '195K',
      impact: 'high'
    },
    {
      time: '10:00',
      currency: 'USD', 
      event: 'ISM Manufacturing PMI',
      forecast: '52.5',
      previous: '51.8',
      impact: 'medium'
    },
    {
      time: '14:00',
      currency: 'USD',
      event: 'Fed Interest Rate Decision',
      forecast: '5.25%',
      previous: '5.25%',
      impact: 'high'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-zinc-200">Economic Calendar</h3>
          </div>
          <div className="text-zinc-400">{date}</div>
        </div>

        {/* Events List */}
        <div className="space-y-3">
          {sampleEvents.map((event, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock className="w-4 h-4" />
                  <span>{event.time}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs border ${getImpactColor(event.impact)}`}>
                  {event.impact === 'low' && 'Min Impact'}
                  {event.impact === 'medium' && 'Medium'}
                  {event.impact === 'high' && 'High Impact'}
                </span>
              </div>
              
              <div className="mb-2 text-zinc-200">{event.title}</div>
              
              {(event.actual || event.forecast || event.previous) && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-700">
                  {event.actual && (
                    <div>
                      <div className="text-zinc-500 text-xs">Actual</div>
                      <div className="text-emerald-400 flex items-center gap-1">
                        {event.actual}
                        <TrendingUp className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                  {event.forecast && (
                    <div>
                      <div className="text-zinc-500 text-xs">Forecast</div>
                      <div className="text-zinc-300">{event.forecast}</div>
                    </div>
                  )}
                  {event.previous && (
                    <div>
                      <div className="text-zinc-500 text-xs">Previous</div>
                      <div className="text-zinc-400">{event.previous}</div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default AttractiveEconomicCalendar;

