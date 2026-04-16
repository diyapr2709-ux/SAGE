import { motion } from 'framer-motion';

export default function GoalsCard({ goals = {} }) {
  const daily = goals.daily || {};
  const weekly = goals.weekly || {};

  return (
    <motion.div
      className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <h2 className="text-lg font-semibold mb-4">🎯 Goals Tracking</h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Daily Target</span>
            <span className="font-medium">${daily.target || 0}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${daily.on_pace ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min((daily.actual_so_far / daily.target) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Actual: ${daily.actual_so_far || 0} | Projected: ${daily.projected || 0}
          </p>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Weekly Target</span>
            <span className="font-medium">${weekly.target || 0}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${weekly.on_pace ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min((weekly.actual_so_far / weekly.target) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Actual: ${weekly.actual_so_far || 0} | Projected: ${weekly.projected || 0}
          </p>
        </div>
      </div>
    </motion.div>
  );
}