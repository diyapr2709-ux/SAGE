import { useEffect, useState } from 'react';
import { RefreshCw, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import Layout from '../components/Layout';
import StatCards from '../components/StatCards';
import BriefingCard from '../components/BriefingCard';
import RevenueChart from '../components/RevenueChart';
import GoalsCard from '../components/GoalsCard';
import ReviewList from '../components/ReviewList';
import StaffingAlert from '../components/StaffingAlert';
import MarginFlags from '../components/MarginFlags';
import RecommendationsList from '../components/RecommendationsList';
import PricingAlerts from '../components/PricingAlerts';
import CrewSchedule from '../components/CrewSchedule';
import EmployeeOfWeek from '../components/EmployeeOfWeek';

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-28 rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.03]" />)}
      </div>
      <div className="h-48 rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 h-64 rounded-2xl bg-white/[0.03]" />
        <div className="col-span-2 h-64 rounded-2xl bg-white/[0.03]" />
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [lastRun, setLastRun] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    api.get('/dashboard/manager')
      .then(res => { setData(res.data); setLastRun(new Date()); })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRun = () => {
    setRunning(true);
    setError(null);
    api.post('/run', {
      business_id: 'Marathon Deli',
      business_type: 'restaurant',
      location: 'College Park',
      cluster: 'A',
    })
      .then(res => { setData(res.data); setLastRun(new Date()); })
      .catch(err => setError(err.response?.data?.detail || 'Analysis failed'))
      .finally(() => setRunning(false));
  };

  return (
    <Layout>
      <div className="space-y-5 max-w-7xl">

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Marathon Deli</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {data?.pulse_summary?.split('\n')[0] || 'Multi-agent intelligence dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRun && (
              <p className="text-xs text-slate-600">
                Last run {lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <button onClick={handleRun} disabled={running || loading} className="btn-primary">
              <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
              {running ? 'Running FRANK…' : 'Run Analysis'}
            </button>
          </div>
        </motion.div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">{error}</div>
        )}

        {loading ? <Skeleton /> : data && (
          <>
            <StatCards data={data} />

            {/* Employee of the Week — visible across all roles */}
            {data.employee_of_the_week?.name && (
              <EmployeeOfWeek eotw={data.employee_of_the_week} />
            )}

            <BriefingCard briefing={data.briefing_text} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <RevenueChart forecast={data.forecast_72hr} rushHours={data.rush_hours} />
              </div>
              <div className="lg:col-span-2">
                <GoalsCard goals={data.goals} />
              </div>
            </div>

            <RecommendationsList recommendations={data.recommendations} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <ReviewList reviews={data.reviews} />
              </div>
              <StaffingAlert staffing={data.staffing} />
            </div>

            {/* CREW full schedule */}
            <CrewSchedule />

            <PricingAlerts
              pricingAlerts={data.pricing_alerts}
              temporalAlerts={data.temporal_alerts}
            />

            <MarginFlags
              flags={data.shelf_flags
                ? { ...data.shelf_flags, cost_intelligence: data.cost_intelligence }
                : data.cost_intelligence
                  ? { cost_intelligence: data.cost_intelligence }
                  : null
              }
            />
          </>
        )}
      </div>
    </Layout>
  );
}
