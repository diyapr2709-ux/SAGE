import { Trophy, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmployeeOfWeek({ eotw }) {
  if (!eotw?.name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-yellow-500/25 p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(249,115,22,0.08) 50%, rgba(99,102,241,0.08) 100%)',
      }}
    >
      {/* Glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-center gap-4">
        {/* Trophy */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl shadow-yellow-500/30 shrink-0">
          <Trophy size={26} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest mb-1">
            ⭐ Employee of the Week
          </p>
          <p className="text-xl font-bold text-white tracking-tight">{eotw.name}</p>
          <p className="text-sm text-slate-400 mt-0.5">{eotw.role}</p>
        </div>

        {eotw.score != null && (
          <div className="text-right shrink-0">
            <p className="text-4xl font-black text-white">{eotw.score}</p>
            <p className="text-xs text-slate-500 mt-0.5">/ 100</p>
            <div className="flex justify-end gap-0.5 mt-1">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  size={10}
                  className={i <= Math.round(eotw.score / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
