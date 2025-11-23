
import React, { useState, useEffect } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { Link, NavLink, useLocation } = ReactRouterDom;
import { useAuth } from '../context/AuthContext';
import { logoSrc } from '../assets/logo';
import { Menu, X, LogIn, UserPlus, LayoutDashboard, BookOpen, Home } from 'lucide-react';

const Navbar: React.FC = () => {
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled((window as any).scrollY > 20);
        };
        (window as any).addEventListener('scroll', handleScroll);
        return () => (window as any).removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200' : 'bg-transparent border-transparent'}`}>
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16 sm:h-20">
                    {/* Logo Area */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <img 
                            src={logoSrc} 
                            alt="LurnX Logo" 
                            style={{ height: '40px', width: 'auto' }}
                            className="h-10 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-sm rounded-md" 
                        />
                        <span className={`text-2xl font-extrabold tracking-tighter transition-colors ${scrolled ? 'text-slate-900' : 'text-slate-900'}`}>
                            LurnX
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-slate-200 shadow-sm">
                        <NavItem to="/" icon={<Home size={16} />} label="Home" />
                        <NavItem to="/batches" icon={<BookOpen size={16} />} label="Batches" />
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <Link to={user.role === 'admin' ? '/admin' : '/study'} className="btn-primary py-2 px-5 text-sm shadow-lg flex items-center gap-2">
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="text-slate-600 hover:text-primary font-semibold text-sm px-4 py-2 transition-colors">
                                    Log in
                                </Link>
                                <Link to="/signup" className="btn-primary py-2.5 px-5 text-sm shadow-md hover:shadow-lg">
                                    Sign Up Free
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button 
                        className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`md:hidden fixed inset-0 z-40 bg-white/98 backdrop-blur-xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} pt-24 px-6`}>
                <div className="flex flex-col space-y-4">
                    <NavLink to="/" className={({isActive}) => `text-lg font-semibold p-4 rounded-xl flex items-center gap-3 transition-colors ${isActive ? 'bg-indigo-50 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}>
                        <Home size={20}/> Home
                    </NavLink>
                    <NavLink to="/batches" className={({isActive}) => `text-lg font-semibold p-4 rounded-xl flex items-center gap-3 transition-colors ${isActive ? 'bg-indigo-50 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}>
                        <BookOpen size={20}/> All Batches
                    </NavLink>
                    
                    <div className="h-px bg-slate-100 my-4"></div>

                    {user ? (
                        <Link to={user.role === 'admin' ? '/admin' : '/study'} className="btn-primary w-full justify-center text-lg py-3 shadow-lg">
                            Go to Dashboard
                        </Link>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <Link to="/login" className="btn-secondary w-full justify-center py-3">Log in</Link>
                            <Link to="/signup" className="btn-primary w-full justify-center py-3 shadow-lg">Create Account</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

const NavItem: React.FC<{to: string, icon: React.ReactNode, label: string}> = ({to, icon, label}) => (
    <NavLink end to={to} className={({ isActive }) => `
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300
        ${isActive 
            ? 'bg-white text-primary shadow-sm scale-105' 
            : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}
    `}>
        {icon}
        <span>{label}</span>
    </NavLink>
);

export default Navbar;