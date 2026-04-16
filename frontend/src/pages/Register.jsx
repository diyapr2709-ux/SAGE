import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Zap, AlertCircle, ArrowRight } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'employee' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b17] p-6"
      style={{ backgroundImage: 'radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.1) 0%, transparent 60%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">SAGE</span>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">Create account</h1>
        <p className="text-slate-500 mt-1.5 mb-8 text-sm">Join your team's SAGE workspace</p>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Jane Smith' },
            { label: 'Email',     key: 'email',     type: 'email', placeholder: 'you@example.com' },
            { label: 'Password',  key: 'password',  type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wide">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                required
                className="input"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wide">Role</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="input"
              style={{ backgroundColor: '#0f1629' }}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-50 mt-1 group"
          >
            {loading ? 'Creating account…' : (
              <>Create account <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-7">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
