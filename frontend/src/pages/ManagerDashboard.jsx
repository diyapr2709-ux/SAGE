import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import BriefingCard from '../components/BriefingCard';
import RevenueChart from '../components/RevenueChart';
import GoalsCard from '../components/GoalsCard';
import ReviewList from '../components/ReviewList';
import StaffingAlert from '../components/StaffingAlert';
import MarginFlags from '../components/MarginFlags';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/manager')
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
      </div>
    </Layout>
  );
}