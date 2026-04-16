import { MessageSquare } from 'lucide-react';

const PRIORITY_COLOR = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-slate-600',
};

function Stars({ count = 0 }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-xs ${i <= count ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
      ))}
    </span>
  );
}

export default function ReviewList({ reviews = [] }) {
  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <MessageSquare size={15} className="text-purple-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Customer Reviews</p>
          <p className="text-xs text-slate-500">VOICE · {reviews.length} signals</p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
        {reviews.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-slate-600 text-sm">No reviews in this run</p>
            <p className="text-slate-700 text-xs mt-1">VOICE will fetch live data when API keys are active</p>
          </div>
        )}
        {reviews.map((r, i) => (
          <div key={i} className="px-5 py-4 hover:bg-white/[0.01] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {r.priority && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLOR[r.priority] || 'bg-slate-600'} mt-0.5`} />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-200">{r.author || 'Anonymous'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Stars count={r.rating} />
                    {r.source && <span className="text-[10px] text-slate-600 font-medium uppercase">{r.source}</span>}
                  </div>
                </div>
              </div>
              {r.priority && (
                <span className={`badge shrink-0 ${
                  r.priority === 'critical' ? 'badge-critical' :
                  r.priority === 'high'     ? 'badge-high' : 'badge-medium'
                }`}>{r.priority}</span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {r.text || r.original_review}
            </p>
            {r.draft_reply && (
              <div className="mt-3 pl-3 border-l-2 border-indigo-500/40">
                <p className="text-[11px] text-indigo-400 font-semibold mb-1">Draft reply</p>
                <p className="text-xs text-slate-500 italic leading-relaxed">{r.draft_reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
