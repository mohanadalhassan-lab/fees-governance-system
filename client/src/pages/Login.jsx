import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, TrendingUp } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-executive-navy via-executive-charcoal to-executive-slate flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Fees Governance System
          </h1>
          <p className="text-executive-silver">
            M.A - Simplify the Vision
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-executive-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-executive-navy mb-2">
              Welcome Back
            </h2>
            <p className="text-executive-steel">
              Sign in to access your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-danger-light border border-danger rounded-lg">
              <p className="text-sm text-danger-dark">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-executive-muted mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="executive-input"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-executive-muted mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="executive-input"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-executive-cream rounded-lg border border-executive-pearl">
            <p className="text-xs font-semibold text-executive-muted uppercase tracking-wider mb-2">
              Demo Credentials
            </p>
            <div className="space-y-1 text-sm text-executive-steel">
              <p><span className="font-medium">CEO:</span> ceo / Demo@2026</p>
              <p><span className="font-medium">GM Retail:</span> gm.retail / Demo@2026</p>
              <p><span className="font-medium">GM Corporate:</span> gm.corporate / Demo@2026</p>
              <p><span className="font-medium">Risk:</span> gm.risk / Demo@2026</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-executive-silver">
            © 2026 QIB - Qatar Islamic Bank. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
