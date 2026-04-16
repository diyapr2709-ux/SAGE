import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export default function RevenueChart({ forecast = [] }) {
  const data = forecast.map((value, idx) => ({
    hour: idx,
    revenue: value
  }));

  return (
    <motion.div
      className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <h2 className="text-lg font-semibold mb-4">📈 72‑Hour Revenue Forecast</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" label={{ value: 'Hours ahead', position: 'insideBottom', offset: -5 }} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}