import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export default function StaffingAlert({ staffing = {} }) {
  const status = staffing.staffing_status;
  const isUnderstaffed = status === 'understaffed';

  return (
    <motion.div
      className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span>👥</span> Staffing
      </h2>
      <div className={`p-3 rounded-lg ${isUnderstaffed ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-start gap-2">
          {isUnderstaffed && <AlertCircle size={18} className="text-amber-600 mt-0.5" />}
          <div>
            <p className="font-medium">{staffing.shift_date} {staffing.shift_start}–{staffing.shift_end}</p>
            <p className="text-sm">{staffing.adjustment || 'Staffing levels balanced'}</p>
            {staffing.financial_impact > 0 && (
              <p className="text-xs text-gray-600 mt-1">Impact: ${staffing.financial_impact}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}