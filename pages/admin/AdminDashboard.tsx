import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Video, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, get, query, limitToLast } from 'firebase/database';
import { User } from '../../types';
import { mockAnalyticsData } from '../../data/mockData';

const initialStats = [
    { title: 'Total Users', value: 0, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    { title: 'Total Courses', value: 0, icon: BookOpen, color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
    { title: 'Total Videos', value: 0, icon: Video, color: 'text-rose-500', bgColor: 'bg-rose-100' },
    { title: 'Total PDFs', value: 0, icon: FileText, color: 'text-amber-500', bgColor: 'bg-amber-100' },
];

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState(initialStats);
    const [recentUsers, setRecentUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // FIX: Use v9 database syntax.
                const usersRef = ref(db, 'users');
                const coursesRef = ref(db, 'courses');
                const videosRef = ref(db, 'videos');
                const materialsRef = ref(db, 'materials');
                const recentUsersQuery = query(usersRef, limitToLast(5));

                const [usersSnap, coursesSnap, videosSnap, materialsSnap, recentUsersSnap] = await Promise.all([
                    get(usersRef), get(coursesRef), get(videosRef), get(materialsRef), get(recentUsersQuery)
                ]);

                const userCount = usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;
                const courseCount = coursesSnap.exists() ? Object.keys(coursesSnap.val()).length : 0;
                const videoCount = videosSnap.exists() ? Object.values(videosSnap.val() as object).reduce((acc: number, courseVideos: any) => acc + Object.keys(courseVideos).length, 0) : 0;
                const materialCount = materialsSnap.exists() ? Object.values(materialsSnap.val() as object).reduce((acc: number, courseMaterials: any) => acc + Object.keys(courseMaterials).length, 0) : 0;
                
                if (recentUsersSnap.exists()) {
                    const usersData = recentUsersSnap.val();
                    const usersList = Object.keys(usersData).map(key => ({
                        id: key, ...usersData[key]
                    })).reverse(); 
                    setRecentUsers(usersList);
                }

                setStats([
                    { ...initialStats[0], value: userCount },
                    { ...initialStats[1], value: courseCount },
                    { ...initialStats[2], value: videoCount },
                    { ...initialStats[3], value: materialCount },
                ]);

            } catch (e) {
                console.error("Failed to fetch dashboard stats:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="opacity-0 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Admin Dashboard</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div 
                      key={stat.title} 
                      className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-md flex items-center gap-5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                    >
                        <div className={`p-3 rounded-full ${stat.bgColor} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
                            <p className="text-3xl font-bold text-slate-800">{loading ? '...' : stat.value.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Monthly Watch Time (Hours)</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockAnalyticsData.watchTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}} />
                                <Line type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} dot={{r: 5, strokeWidth: 2, fill: "#fff"}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 <div className="lg:col-span-1 bg-white border border-slate-200/80 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Recent Student Signups</h2>
                    <div className="space-y-4">
                        {loading ? Array.from({length: 5}).map((_, i) => <UserSkeleton key={i} />) : 
                            recentUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm flex-shrink-0">
                                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="truncate">
                                        <p className="font-semibold text-sm text-slate-700 truncate">{user.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

const UserSkeleton = () => (
    <div className="flex items-center gap-4 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
            <div className="h-3 w-full bg-slate-200 rounded"></div>
        </div>
    </div>
)

export default AdminDashboard;