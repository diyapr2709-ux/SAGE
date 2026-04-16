import { motion } from 'framer-motion';

export default function ReviewList({ reviews = [] }) {
  return (
    <motion.div
      className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <h2 className="text-lg font-semibold mb-4">💬 Recent Reviews</h2>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {reviews.slice(0, 5).map((review, idx) => (
          <div key={idx} className="border-b pb-2 last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{review.author || 'Anonymous'}</span>
              <span className="text-yellow-500">{'★'.repeat(review.rating || 0)}</span>
            </div>
            <p className="text-sm text-gray-600">{review.text || review.original_review}</p>
            {review.draft_reply && (
              <p className="text-xs text-indigo-600 mt-1 italic">Reply draft: {review.draft_reply}</p>
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-gray-500 text-sm">No recent reviews</p>}
      </div>
    </motion.div>
  );
}