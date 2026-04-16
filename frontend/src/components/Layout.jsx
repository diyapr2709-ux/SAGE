import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">SAGE Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.full_name} ({user?.role})</span>
            <button
              onClick={logout}
              className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}