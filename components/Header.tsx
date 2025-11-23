
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
// FIX: Replaced v5 `useHistory` with v6 `useNavigate`.
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { useNavigate } = ReactRouterDom;
import { LogOut, User, Bell, ChevronDown, BookOpen, MessageSquare } from 'lucide-react';
import { logoSrc } from '../assets/logo';



interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();
  // FIX: Switched to useNavigate hook for v6.
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    // FIX: Changed navigation method to navigate for v6.
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target as any)) {
        setDropdownOpen(false);
      }
    };
    (window as any).document.addEventListener("mousedown", handleClickOutside);
    return () => (window as any).document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const getInitials = (name: string = '') => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 p-4 border-b border-slate-200/80 shadow-sm flex justify-between items-center animate-fade-in">
      <div className='flex items-center gap-4'>
        <img src={logoSrc} alt="VedPath Logo" className="h-9 w-auto hidden md:block" />
        <h1 className="text-xl font-bold tracking-tight text-slate-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
          <Bell size={20} />
        </button>
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-secondary text-white flex items-center justify-center font-bold text-sm">
              {getInitials(user?.name)}
            </div>
            <div className="text-right hidden md:block">
              <p className="font-semibold text-sm text-slate-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize leading-tight">{user?.role}</p>
            </div>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-xl animate-fade-in-up py-1">
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2">
                <User size={16} /> My Profile
              </button>
               <button onClick={() => navigate('/dashboard')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2">
                <BookOpen size={16} /> My Courses
              </button>
              <button onClick={() => navigate('/support')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2">
                <MessageSquare size={16} /> Help & Support
              </button>
              <hr className="my-1 border-slate-100" />
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
