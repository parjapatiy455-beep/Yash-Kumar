import React, { useState, FormEvent } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDom;
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { UserPlus } from 'lucide-react';

const SignupPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signup } = useAuth();
    const { logoUrl, appName } = useBranding();

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const newUser = await signup(name, email, password);
            if (newUser) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError("An account with this email already exists. Please log in.");
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. It should be at least 6 characters.');
            } else {
                setError(err.message || 'An error occurred during signup.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-login py-8 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 opacity-0 animate-fade-in-up">
                <div className="text-center">
                    <img src={logoUrl} alt={`${appName} Logo`} className="mx-auto h-14 w-auto mb-4" />
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        Create Your Account
                    </h2>
                     <p className="mt-2 text-slate-600">Start your learning journey with us today.</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-xl p-8 space-y-6">
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name</label>
                            <input id="name" name="name" type="text" required value={name} onChange={(e) => setName((e.target as any).value)}
                                className="input-style" placeholder="Your Name" />
                        </div>
                        <div>
                            <label htmlFor="email-address" className="text-sm font-semibold text-slate-700">Email Address</label>
                            <input id="email-address" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail((e.target as any).value)}
                                className="input-style" placeholder="you@example.com" />
                        </div>
                        <div>
                            <label htmlFor="password"  className="text-sm font-semibold text-slate-700">Password</label>
                            <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword((e.target as any).value)}
                                className="input-style" placeholder="6+ characters" />
                        </div>
                        
                        {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
                        
                        <div className="pt-2">
                             <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full"
                            >
                                <UserPlus size={16} />
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-sm text-slate-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;