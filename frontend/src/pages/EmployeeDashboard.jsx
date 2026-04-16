import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import BriefingCard from '../components/BriefingCard';

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/employee')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="flex justify-center items-center h-full">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <BriefingCard briefing={data.briefing} />
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3">📅 My Schedule</h2>
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.my_schedule, null, 2)}</pre>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-3">✅ Tasks</h2>
          <ul className="list-disc list-inside text-sm">
            {data.tasks?.map((task, i) => <li key={i}>{task}</li>)}
          </ul>
        </div>
      </div>
    </Layout>
  );
}