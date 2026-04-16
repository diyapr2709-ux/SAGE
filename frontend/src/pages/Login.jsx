import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Zap, AlertCircle, ArrowRight } from 'lucide-react';

const AGENTS = [
  { name: 'FRANK', desc: 'Orchestrator', color: 'from-indigo-500 to-purple-500' },
  { name: 'PULSE', desc: 'Revenue forecast', color: 'from-blue-500 to-cyan-500' },
  { name: 'VOICE', desc: 'Market intelligence', color: 'from-purple-500 to-pink-500' },
  { name: 'SHELF', desc: 'Cost intelligence', color: 'from-emerald-500 to-teal-500' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#060b17]"
      style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.12) 0%, transparent 60%)' }}
    >
      {/* Left — branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SAGE</span>
        </div>

        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold text-white leading-tight tracking-tight"
          >
            Autonomous<br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Growth Engine
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 mt-4 text-lg leading-relaxed max-w-sm"
          >
            Four AI agents working in parallel to surface your highest-impact decisions — every morning.
          </motion.p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {AGENTS.map((a, i) => (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
              >
                <div className={`text-xs font-bold bg-gradient-to-r ${a.color} bg-clip-text text-transparent mb-1`}>
                  {a.name}
                </div>
                <p className="text-xs text-slate-600 font-medium">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-slate-700 text-xs">© 2026 SAGE · Autonomous Growth Engine</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-white">SAGE</span>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-slate-500 mt-1.5 mb-8 text-sm">Sign in to your SAGE workspace</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-5"
            >
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-50 mt-2 group"
            >
              {loading ? 'Signing in…' : (
                <>Sign in <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-7">
            No account?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
