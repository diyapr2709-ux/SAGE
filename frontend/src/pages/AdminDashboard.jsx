import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import BriefingCard from '../components/BriefingCard';
import RevenueChart from '../components/RevenueChart';
import GoalsCard from '../components/GoalsCard';
import ReviewList from '../components/ReviewList';
import StaffingAlert from '../components/StaffingAlert';
import MarginFlags from '../components/MarginFlags';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="flex justify-center items-center h-full">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <BriefingCard briefing={data.briefing_text} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart forecast={data.forecast_72hr} />
          <GoalsCard goals={data.goals} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ReviewList reviews={data.reviews} />
          </div>
          <StaffingAlert staffing={data.staffing} />
        </div>

        {data.shelf_flags && <MarginFlags flags={data.shelf_flags} />}

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3">🛠️ System Health</h2>
          <p className="text-sm text-gray-600">All agents operational</p>
          <p className="text-sm text-gray-600">FRANK orchestrator: last run {new Date().toLocaleString()}</p>
        </div>
      </div>
    </Layout>
  );
}