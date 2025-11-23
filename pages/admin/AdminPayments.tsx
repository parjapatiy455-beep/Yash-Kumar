
import React from 'react';
import { DollarSign, Download, Filter } from 'lucide-react';

const AdminPayments: React.FC = () => {
    return (
        <div className="opacity-0 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-slate-900">Payment Management</h1>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">
                        <Filter size={16} />
                        Filter
                    </button>
                     <button className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold">Transaction ID</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Student</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Course</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Amount</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Date</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* This is a placeholder for real data */}
                        {Array.from({ length: 5 }).map((_, index) => (
                            <tr key={index} className="border-b border-slate-200">
                                <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded animate-pulse"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div></td>
                                <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div></td>
                                <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse"></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="p-12 text-center text-slate-500">
                    <DollarSign className="mx-auto text-slate-400" size={40} />
                    <h3 className="text-lg font-semibold mt-4">No Transactions Yet</h3>
                    <p className="text-sm mt-1">When students purchase courses, their payment history will appear here.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminPayments;
