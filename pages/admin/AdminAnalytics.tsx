import React, { useState, useEffect } from 'react';
import { mockAnalyticsData } from '../../data/mockData';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingIndicator from '../../components/LoadingIndicator';

const AdminAnalytics: React.FC = () => {
    const [analyticsData, setAnalyticsData] = useState<typeof mockAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setAnalyticsData(mockAnalyticsData);
            setLoading(false);
        }, 500);
    }, []);

    if (loading) {
        return <LoadingIndicator />;
    }

    if (!analyticsData) {
        return <div className="text-center p-8 bg-white rounded-lg shadow">No analytics data available.</div>;
    }

    return (
        <div className="opacity-0 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Platform Analytics</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Monthly Watch Time (Hours)</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.watchTimeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12}/>
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}} />
                                <Line type="monotone" dataKey="hours" name="Watch Hours" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} dot={{r: 5, strokeWidth: 2, fill: "#fff"}}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Course Completion Rate</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.courseCompletionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis unit="%" stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="completion" name="Completion %" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;