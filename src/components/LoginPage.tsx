import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <TrendingUp className="text-zinc-950" size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-100">FESGA</h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-zinc-100">Welcome Back</h2>
            <p className="text-zinc-500 text-sm mt-1">Sign in to access the ESG Risk Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center gap-3 text-rose-400 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="name@company.ai"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
              Authorized Personnel Only. <br />
              All access is monitored and audited.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <div className="text-[10px] text-zinc-700">
            <span className="font-bold">Admin:</span> admin@fesga.ai / admin123
          </div>
          <div className="text-[10px] text-zinc-700">
            <span className="font-bold">Analyst:</span> analyst@fesga.ai / analyst123
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
