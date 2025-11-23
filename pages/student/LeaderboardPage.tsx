
import React, { useState, useEffect } from 'react';
import { useLayout } from '../../components/StudentLayout';
import { db } from '../../firebase';
import { ref, query, orderByChild, limitToLast, get } from 'firebase/database';
import { User } from '../../types';
import { Trophy, Medal, Crown } from 'lucide-react';
import LoadingIndicator from '../../components/LoadingIndicator';

const LeaderboardPage: React.FC = () => {
    const { setHeaderTitle } = useLayout();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setHeaderTitle('Leaderboard');
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const usersRef = query(ref(db, 'users'), orderByChild('watchedHours'), limitToLast(20));
                const snapshot = await get(usersRef);
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const leaderboardData: User[] = Object.keys(data).map(key => ({
                        ...data[key],
                        id: key
                    }))
                    .filter(u => u.role === 'student')
                    .sort((a, b) => (b.watchedHours || 0) - (a.watchedHours || 0));
                    
                    setUsers(leaderboardData);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [setHeaderTitle]);

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown size={24} className="text-yellow-500 fill-yellow-500 animate-bounce" />;
        if (index === 1) return <Medal size={24} className="text-gray-400 fill-gray-300" />;
        if (index === 2) return <Medal size={24} className="text-amber-700 fill-amber-600" />;
        return <span className="text-lg font-bold text-slate-500">#{index + 1}</span>;
    };

    return (
        <div className="opacity-0 animate-fade-in-up max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-8 mb-8 text-white shadow-2xl relative overflow-hidden">
                 <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Weekly Champions</h2>
                        <p className="text-blue-100">Top students dedicated to learning this week.</p>
                    </div>
                    <Trophy size={80} className="text-yellow-300 drop-shadow-lg animate-float" />
                 </div>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            </div>

            {loading ? <LoadingIndicator /> : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Rank</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Student</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-right">Watch Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user, index) => (
                                    <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${index < 3 ? 'bg-yellow-50/30' : ''}`}>
                                        <td className="px-6 py-4 w-24 text-center">
                                            <div className="flex justify-center">{getRankIcon(index)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-primary'}`}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{user.name}</p>
                                                    <p className="text-xs text-slate-500">Student</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-bold">
                                                {(user.watchedHours || 0).toFixed(1)} hrs
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-8 text-slate-500">No students active yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaderboardPage;
