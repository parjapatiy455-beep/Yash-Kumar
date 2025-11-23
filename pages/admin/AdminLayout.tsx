import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { NavLink, useNavigate } = ReactRouterDom;
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../hooks/useBranding';
import { LayoutDashboard, BookCopy, Users, BarChart, LogOut, CreditCard, Megaphone, MessageSquare, Settings, User, Bell, ChevronDown, Menu } from 'lucide-react';

// Header Component
const AdminHeader: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target as any)) {
        setDropdownOpen(false);
      }
    };
    (window as any).document.addEventListener("mousedown", handleClickOutside);
    return () => (window as any).document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string = '') => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 p-4 border-b border-slate-200/80 shadow-sm flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-slate-600" aria-label="Open menu">
            <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Admin Panel</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm">
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
              <button onClick={() => navigate('/admin/settings')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2">
                <Settings size={16} /> Settings
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


const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { logoUrl, appName } = useBranding();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Courses', path: '/admin/courses', icon: BookCopy },
        { name: 'Students', path: '/admin/students', icon: Users },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart },
    ];
    
    const secondaryNavItems = [
        { name: 'Payments', path: '/admin/payments', icon: CreditCard },
        { name: 'Announcements', path: '/admin/announcements', icon: Megaphone },
        { name: 'Support', path: '/admin/support', icon: MessageSquare },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
    ];

    const baseLinkClass = "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm";
    const activeLinkClass = "bg-primary text-white shadow-md shadow-primary/30";
    const inactiveLinkClass = "text-slate-500 hover:bg-slate-100 hover:text-primary";

    return (
        <div className="flex h-screen bg-light text-slate-800 overflow-hidden">
            <aside className={`fixed top-0 left-0 h-full z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col p-4 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="px-2 mb-8 flex items-center gap-3">
                    <img src={logoUrl} alt={`${appName} Logo`} className="h-10 w-auto rounded-md" />
                    <span className="text-xl font-bold text-slate-800">{appName} Admin</span>
                </div>
                <nav className="flex-1 flex flex-col justify-between">
                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Main</p>
                        <ul className="space-y-1.5">
                            {navItems.map(item => (
                                <li key={item.name}>
                                    <NavLink
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                                    >
                                        <item.icon size={20} />
                                        <span>{item.name}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                         <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-2">Management</p>
                         <ul className="space-y-1.5">
                            {secondaryNavItems.map(item => (
                                <li key={item.name}>
                                    <NavLink
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                                    >
                                        <item.icon size={20} />
                                        <span>{item.name}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>
            </aside>

             {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto bg-light">
                    <div className="p-4 sm:p-6 md:p-8">
                       {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;