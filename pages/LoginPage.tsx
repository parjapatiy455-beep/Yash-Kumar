import React, { useState, FormEvent } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDom;
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { LogIn } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const { logoUrl, appName } = useBranding();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser) {
        if (loggedInUser.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err: any) {
       if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            setError('Invalid credentials. Please try again.');
        } else {
            setError('An unexpected error occurred. Please try again.');
            console.error(err);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await loginWithGoogle();
      if (loggedInUser) {
        if (loggedInUser.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError(''); 
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google sign-in. Please contact support.');
      }
      else {
        setError('Failed to sign in with Google. Please try again.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100">
      <div className="w-full max-w-md space-y-8 opacity-0 animate-fade-in-up">
        <div className="text-center">
            <Link to="/">
                <img src={logoUrl} alt={`${appName} Logo`} className="mx-auto h-16 w-auto mb-6 drop-shadow-md hover:scale-105 transition-transform" />
            </Link>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome Back
            </h2>
            <p className="mt-2 text-slate-600">Sign in to continue your learning journey.</p>
        </div>
        
        <div className="glass p-8 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden">
          {/* Decorative background blob */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10"></div>
          
          <form onSubmit={handleLogin}>
            <div className="space-y-5">
                <div>
                    <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail((e.target as any).value)}
                        className="input-style bg-white/50 focus:bg-white"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label htmlFor="password"  className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword((e.target as any).value)}
                        className="input-style bg-white/50 focus:bg-white"
                        placeholder="••••••••"
                    />
                </div>
            </div>
             {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center mt-4 font-medium">{error}</div>}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-base py-3 shadow-lg"
              >
                <LogIn size={18} className="transition-transform group-hover:translate-x-1"/>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-slate-500 rounded-full border border-slate-200">Or continue with</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="btn-secondary w-full flex justify-center items-center gap-3 py-2.5 hover:bg-slate-50"
              >
                <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 398.8 0 256S110.3 0 244 0c74.3 0 134.3 29.3 179.2 71.8l-68.5 66.8C296.5 98.6 272.2 82 244 82c-66.2 0-120 53.8-120 120s53.8 120 120 120c73.2 0 106.5-54.2 110.3-82.8H244v-75.5h236.4c2.5 12.8 3.6 26.1 3.6 39.5z"></path>
                </svg>
                Google Account
            </button>
          </div>

           <p className="text-center text-sm text-slate-600 pt-2">
                Don't have an account?{' '}
                <Link to="/signup" className="font-bold text-primary hover:text-primary-hover transition-colors">
                    Sign up for free
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;