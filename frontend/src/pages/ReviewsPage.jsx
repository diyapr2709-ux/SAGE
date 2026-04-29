import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ThumbsUp, ThumbsDown, Star, AlertTriangle, MessageSquare, TrendingUp } from 'lucide-react'
import { apiDashboardManager, apiGetLastOutput } from '../api/client'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
})

const MOCK = {
  reviews: [
    { reply_text: "Best breakfast sandwich in College Park, staff was super friendly!", sentiment: "positive", rating: 5, platform: "Google" },
    { reply_text: "Wait times were long on Saturday afternoon but food made up for it.", sentiment: "neutral",  rating: 3, platform: "Yelp"   },
    { reply_text: "Aarav at the register always remembers my order. Great service!",    sentiment: "positive", rating: 5, platform: "Google" },
    { reply_text: "Food is great but parking is a nightmare on weekends.",              sentiment: "neutral",  rating: 3, platform: "Google" },
    { reply_text: "Honestly the best deli near campus. Love the lunch specials.",       sentiment: "positive", rating: 5, platform: "Yelp"   },
  ],
  pricing_alerts:  ["DoorDash commission rate increased to 30% — review contract terms"],
  temporal_alerts: [],
}

function StarRating({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={13} fill={i < rating ? '#FBBF24' : 'none'} color={i < rating ? '#FBBF24' : '#D1D5DB'} />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    apiDashboardManager()
      .then(res => setData(res.data))
      .catch(() => apiGetLastOutput().then(r => setData(r.data)).catch(() => setData(null)))
      .finally(() => setLoading(false))
  }, [])

  const d = data || MOCK
  const reviews        = d.reviews || []
  const pricingAlerts  = d.pricing_alerts || []
  const temporalAlerts = d.temporal_alerts || []
  const allAlerts      = [...pricingAlerts, ...temporalAlerts]

  const positive = reviews.filter(r => r.sentiment === 'positive' || r.rating >= 4)
  const neutral  = reviews.filter(r => r.sentiment === 'neutral'  || r.rating === 3)
  const negative = reviews.filter(r => r.sentiment === 'negative' || r.rating <= 2)
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—'

  const filtered = filter === 'all' ? reviews
    : filter === 'positive' ? positive
    : filter === 'neutral'  ? neutral
    : negative

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>VOICE Agent</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)', lineHeight: 1 }}>Reputation & Reviews</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>Customer sentiment and reputation intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Total Reviews', value: reviews.length, color: '#3B82F6' },
            { label: 'Avg Rating',    value: avgRating,      color: '#FBBF24' },
            { label: 'Positive',      value: positive.length, color: '#22C55E' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '10px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Alerts */}
      {allAlerts.length > 0 && (
        <motion.div {...fadeUp(1)}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Active Alerts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allAlerts.map((alert, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '14px 18px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 12 }}>
                <AlertTriangle size={15} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: '0.85rem', color: '#B91C1C', fontWeight: 500 }}>
                  {typeof alert === 'string' ? alert : (alert.recommended_action || alert.insight || alert.detail || JSON.stringify(alert))}
                  {alert.financial_impact ? <span style={{ marginLeft: 8, fontWeight: 700 }}>(${alert.financial_impact?.toLocaleString()} impact)</span> : null}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sentiment summary bar */}
      {reviews.length > 0 && (
        <motion.div {...fadeUp(2)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Sentiment Breakdown</p>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Positive', count: positive.length, color: '#22C55E', bg: '#F0FDF4', icon: ThumbsUp },
              { label: 'Neutral',  count: neutral.length,  color: '#FBBF24', bg: '#FFFBEB', icon: MessageSquare },
              { label: 'Negative', count: negative.length, color: '#EF4444', bg: '#FFF5F5', icon: ThumbsDown },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '16px', background: s.bg, borderRadius: 12, textAlign: 'center' }}>
                <s.icon size={18} color={s.color} style={{ marginBottom: 8 }} />
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: s.color, lineHeight: 1 }}>{s.count}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
            {reviews.length > 0 && (
              <>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(positive.length / reviews.length) * 100}%` }} transition={{ duration: 0.7, delay: 0.2 }} style={{ height: '100%', background: '#22C55E' }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${(neutral.length  / reviews.length) * 100}%` }} transition={{ duration: 0.7, delay: 0.3 }} style={{ height: '100%', background: '#FBBF24' }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${(negative.length / reviews.length) * 100}%` }} transition={{ duration: 0.7, delay: 0.4 }} style={{ height: '100%', background: '#EF4444' }} />
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Reviews list */}
      <motion.div {...fadeUp(3)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Customer Reviews</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'positive', 'neutral', 'negative'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
                background: filter === f ? 'var(--blue-600)' : 'var(--surface)',
                color: filter === f ? 'white' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((r, i) => {
              const text = r.reply_text || r.original_review || r.text || JSON.stringify(r)
              const isPositive = r.sentiment === 'positive' || r.rating >= 4
              const isNegative = r.sentiment === 'negative' || r.rating <= 2
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  style={{ background: 'white', border: `1px solid ${isPositive ? '#BBF7D0' : isNegative ? '#FECACA' : 'var(--border)'}`, borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-xs)' }}
                  whileHover={{ y: -1, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: isPositive ? '#F0FDF4' : isNegative ? '#FFF5F5' : 'var(--surface)',
                        border: `1px solid ${isPositive ? '#BBF7D0' : isNegative ? '#FECACA' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isPositive ? <ThumbsUp size={15} color="#22C55E" /> : isNegative ? <ThumbsDown size={15} color="#EF4444" /> : <MessageSquare size={15} color="var(--text-muted)" />}
                      </div>
                      <div>
                        {(r.author || r.platform) && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{r.author || r.platform}</div>}
                        {r.rating && <StarRating rating={r.rating} />}
                      </div>
                    </div>
                    <div style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
                      background: isPositive ? '#F0FDF4' : isNegative ? '#FFF5F5' : 'var(--yellow-50)',
                      color: isPositive ? '#16A34A' : isNegative ? '#DC2626' : '#92400E',
                      border: `1px solid ${isPositive ? '#BBF7D0' : isNegative ? '#FECACA' : 'var(--yellow-200)'}`,
                      textTransform: 'capitalize',
                    }}>
                      {r.sentiment || (isPositive ? 'positive' : isNegative ? 'negative' : 'neutral')}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.65, margin: 0 }}>{text}</p>
                  {r.draft_reply && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 8 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--blue-600)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Draft Reply — </span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--blue-800)' }}>{r.draft_reply}</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No {filter === 'all' ? '' : filter} reviews found
          </div>
        )}
      </motion.div>
    </div>
  )
}
