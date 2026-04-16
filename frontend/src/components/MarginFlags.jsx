import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function MarginFlags({ flags }) {
  if (!flags || !flags.flag) return null;

  return (
    <motion.div
      className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle size={20} className="text-amber-500" />
        Margin Alert
      </h2>
      <p><span className="font-medium">{flags.item_id}</span> margin at {flags.margin_pct}%</p>
      <p className="text-sm text-gray-600">{flags.recommended_action}</p>
      <p className="text-xs text-gray-500 mt-1">Impact: ${flags.impact}</p>
    </motion.div>
  );
}