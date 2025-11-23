import React, { useState, createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { NavLink, useNavigate } = ReactRouterDom;
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { BookOpen, LayoutGrid, MessageSquare, LogOut, User, Bell, ChevronDown, Menu, Cpu, Trophy } from 'lucide-react';

// Layout Context for managing header title
interface LayoutContextType {
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
}
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);
export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error('useLayout must be used within a StudentLayout');
    return context;
};

// Main Layout Component
const StudentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [headerTitle, setHeaderTitle] = useState('Study');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <LayoutContext.Provider value={{ headerTitle, setHeaderTitle }}>
            <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                 {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/60 z-30 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-hidden="true"
                    ></div>
                )}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header title={headerTitle} onMenuClick={() => setIsSidebarOpen(true)} />
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-light">
                        {children}
                    </main>
                </div>
            </div>
        </LayoutContext.Provider>
    );
};

// Sidebar Component
export const Sidebar: React.FC<{ isSidebarOpen: boolean, setIsSidebarOpen: (isOpen: boolean) => void }> = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const { logoUrl, appName } = useBranding();
    const navItems = [
        { name: 'Study', path: '/study', icon: BookOpen },
        { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    ];
    const studyPacks = [
         { name: 'Batches', path: '/batches', icon: LayoutGrid },
         { name: 'AI Test Generator', path: '/ai-test-generator', icon: Cpu },

    ];
    const supportItems = [
        { name: 'Help & Support', path: '/support', icon: MessageSquare },
    ];

    return (
        <aside className={`fixed top-0 left-0 h-full z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col p-4 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="px-2 mb-8 flex items-center gap-3">
                <img src={logoUrl} alt={`${appName} Logo`} className="h-10 w-auto rounded-md" />
                <span className="text-2xl font-bold text-slate-800">{appName}</span>
            </div>
            <nav className="flex-1 flex flex-col justify-between">
                <div>
                    <SidebarSection title="Learn Online" items={navItems} closeSidebar={() => setIsSidebarOpen(false)} />
                    <SidebarSection title="Study Packs" items={studyPacks} closeSidebar={() => setIsSidebarOpen(false)} />
                    <SidebarSection title="Support" items={supportItems} closeSidebar={() => setIsSidebarOpen(false)} />
                </div>
            </nav>
        </aside>
    );
};

const SidebarSection: React.FC<{title: string, items: any[], closeSidebar: () => void}> = ({ title, items, closeSidebar }) => {
    const baseClasses = "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm";
    const activeClasses = "bg-primary text-white shadow-md shadow-primary/30";
    const inactiveClasses = "text-slate-500 hover:bg-slate-100 hover:text-primary";
    const disabledClasses = "opacity-50 cursor-not-allowed";

    return (
        <div className="mb-6">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
            <ul className="space-y-1.5">
                {items.map(item => {
                    const isExternal = item.path.startsWith('http');
                    return (
                        <li key={item.name}>
                            {isExternal ? (
                                <a
                                    href={item.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={closeSidebar}
                                    className={`${baseClasses} ${inactiveClasses}`}
                                >
                                    <item.icon size={20} />
                                    <span>{item.name}</span>
                                </a>
                            ) : (
                                <NavLink
                                    to={item.disabled ? '#' : item.path}
                                    onClick={closeSidebar}
                                    className={({ isActive }) => `${baseClasses} ${item.disabled ? disabledClasses : ""} ${isActive ? activeClasses : inactiveClasses}`}
                                >
                                    <item.icon size={20} />
                                    <span>{item.name}</span>
                                </NavLink>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};


// Header Component (integrated into layout)
const Header: React.FC<{ title: string, onMenuClick: () => void }> = ({ title, onMenuClick }) => {
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
  }, [dropdownRef]);

  const getInitials = (name: string = '') => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 p-4 border-b border-slate-200/80 shadow-sm flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-slate-600" aria-label="Open menu">
            <Menu size={24} />
        </button>
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
               <button onClick={() => navigate('/study')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2">
                <BookOpen size={16} /> My Study
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

export default StudentLayout;