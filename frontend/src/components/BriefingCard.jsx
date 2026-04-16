import { motion } from 'framer-motion';

export default function BriefingCard({ briefing }) {
  return (
    <motion.div
      className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span>📋</span> Daily Briefing
      </h2>
      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{briefing}</pre>
    </motion.div>
  );
}