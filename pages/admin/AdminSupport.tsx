
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, get, update, push, set } from 'firebase/database';
import { SupportTicket, Reply } from '../../types';
import { useAuth } from '../../context/AuthContext';
import LoadingIndicator from '../../components/LoadingIndicator';
import { Search, X, Send } from 'lucide-react';

const TicketStatusBadge: React.FC<{ status: SupportTicket['status'] }> = ({ status }) => {
    const baseClasses = 'px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block';
    const statusClasses = {
        Open: 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-amber-100 text-amber-800',
        Closed: 'bg-slate-200 text-slate-800',
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const TicketDetailModal: React.FC<{ ticket: SupportTicket, onClose: () => void, onReply: (ticketId: string, replyText: string) => Promise<void> }> = ({ ticket, onClose, onReply }) => {
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    // FIX: Cast Object.values to Reply[] to provide type information for sorting and mapping.
    const replies = ticket.replies ? (Object.values(ticket.replies) as Reply[]).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setIsReplying(true);
        await onReply(ticket.id, replyText);
        setReplyText('');
        setIsReplying(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-slate-800 truncate pr-4">{ticket.subject}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <p className="text-sm text-slate-500">Student</p>
                        <p className="font-semibold text-slate-800">{ticket.userName} ({ticket.userEmail})</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Status</p>
                        <TicketStatusBadge status={ticket.status} />
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-500">Conversation</p>
                        <div className="bg-slate-50 p-3 rounded-md border text-slate-700">
                             <p className="font-bold text-sm">{ticket.userName} <span className="text-slate-400 font-normal text-xs ml-1">{new Date(ticket.createdAt).toLocaleString()}</span></p>
                             <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.message}</p>
                        </div>
                        {replies.map(reply => (
                             <div key={reply.id} className={`${reply.author === 'admin' ? 'bg-blue-50' : 'bg-slate-50'} p-3 rounded-md border`}>
                                <p className="font-bold text-sm">{reply.authorName} <span className="text-slate-400 font-normal text-xs ml-1">{new Date(reply.createdAt).toLocaleString()}</span></p>
                                <p className="mt-1 whitespace-pre-wrap text-sm">{reply.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 {ticket.status !== 'Closed' && (
                    <div className="p-4 border-t mt-auto">
                        <form onSubmit={handleReplySubmit}>
                            <label htmlFor="reply" className="font-semibold text-sm text-slate-700 mb-2 block">Your Reply</label>
                            <textarea
                                id="reply"
                                value={replyText}
                                onChange={(e) => setReplyText((e.target as any).value)}
                                rows={4}
                                placeholder="Type your response here..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-y"
                            />
                            <button type="submit" disabled={isReplying} className="mt-3 w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-slate-600">
                                <Send size={16} />
                                {isReplying ? 'Sending...' : 'Send Reply'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminSupport: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            // FIX: Use v9 database syntax.
            const ticketsRef = ref(db, 'supportTickets');
            const snapshot = await get(ticketsRef);
            if (snapshot.exists()) {
                const ticketsData = snapshot.val();
                const ticketsList = Object.keys(ticketsData).map(key => ({
                    id: key,
                    ...ticketsData[key]
                })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                setTickets(ticketsList);
            }
        } catch (error) {
            console.error("Failed to fetch support tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleStatusChange = async (ticketId: string, newStatus: SupportTicket['status']) => {
        try {
            // FIX: Use v9 database syntax.
            const ticketRef = ref(db, `supportTickets/${ticketId}`);
            const newUpdatedAt = new Date().toISOString();
            await update(ticketRef, { 
                status: newStatus,
                updatedAt: newUpdatedAt 
            });
            const updatedTickets = tickets.map(t => 
                t.id === ticketId ? { ...t, status: newStatus, updatedAt: newUpdatedAt } : t
            );
            setTickets(updatedTickets);
            if (selectedTicket && selectedTicket.id === ticketId) {
                setSelectedTicket(prev => prev ? {...prev, status: newStatus, updatedAt: newUpdatedAt} : null);
            }
        } catch (error) {
            console.error("Failed to update ticket status:", error);
        }
    };
    
    const handleSendReply = async (ticketId: string, replyText: string) => {
        if (!user) return;
        try {
            // FIX: Use v9 database syntax.
            const repliesRef = ref(db, `supportTickets/${ticketId}/replies`);
            const newReplyRef = push(repliesRef);
            const now = new Date().toISOString();

            const newReply: Omit<Reply, 'id'> = {
                author: 'admin',
                authorName: user.name,
                text: replyText,
                createdAt: now,
            };
            // FIX: Use v9 database syntax.
            await set(newReplyRef, newReply);

            // Update ticket's updatedAt and status
            const ticketRef = ref(db, `supportTickets/${ticketId}`);
            await update(ticketRef, {
                updatedAt: now,
                status: 'In Progress'
            });

            // Update local state
            const updatedTickets = tickets.map(t => {
                if (t.id === ticketId) {
                    const newReplyWithId = { ...newReply, id: newReplyRef.key! };
                    const updatedReplies = { ...(t.replies || {}), [newReplyWithId.id]: newReplyWithId };
                    return { ...t, replies: updatedReplies, status: 'In Progress' as const, updatedAt: now };
                }
                return t;
            });
            setTickets(updatedTickets);
             if (selectedTicket && selectedTicket.id === ticketId) {
                const newReplyWithId = { ...newReply, id: newReplyRef.key! };
                const updatedReplies = { ...(selectedTicket.replies || {}), [newReplyWithId.id]: newReplyWithId };
                setSelectedTicket(prev => prev ? {...prev, replies: updatedReplies, status: 'In Progress', updatedAt: now} : null);
            }

        } catch (error) {
            console.error("Failed to send reply:", error);
        }
    };

    const filteredTickets = tickets.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="opacity-0 animate-fade-in-up">
            {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onReply={handleSendReply} />}
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Support Tickets</h1>
            <div className="mb-6">
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={20} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by subject, name, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm((e.target as any).value)}
                        className="w-full max-w-sm pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {loading ? <LoadingIndicator /> : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                         <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">Student</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Subject</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Last Updated</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTickets.map(ticket => (
                                <tr key={ticket.id} className="border-b border-slate-200 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-800">{ticket.userName}</p>
                                        <p className="text-slate-500 text-xs">{ticket.userEmail}</p>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800 max-w-sm truncate">{ticket.subject}</td>
                                    <td className="px-6 py-4">
                                        <TicketStatusBadge status={ticket.status} />
                                    </td>
                                    <td className="px-6 py-4">{new Date(ticket.updatedAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                        <select
                                            value={ticket.status}
                                            onChange={(e) => handleStatusChange(ticket.id, (e.target as any).value as SupportTicket['status'])}
                                            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="Open">Open</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTickets.length === 0 && (
                        <p className="text-center text-slate-500 py-12">No support tickets found.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminSupport;
