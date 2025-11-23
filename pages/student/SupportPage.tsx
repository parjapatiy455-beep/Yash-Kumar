
import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, push, set, query, orderByChild, equalTo, get, update } from 'firebase/database';
import { SupportTicket, Reply } from '../../types';
import LoadingIndicator from '../../components/LoadingIndicator';
import { Send, Search, ChevronDown, X } from 'lucide-react';
import { useLayout } from '../../components/StudentLayout';

const TicketStatusBadge: React.FC<{ status: SupportTicket['status'] }> = ({ status }) => {
    const baseClasses = 'px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block';
    const statusClasses = {
        Open: 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-amber-100 text-amber-800',
        Closed: 'bg-slate-200 text-slate-800',
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const faqData = [
    { q: "How to join live class?", a: "Live classes can be accessed from your dashboard under the 'Today's Class' section or from the course page at the scheduled time." },
    { q: "How to track my order/order status?", a: "For any physical study materials, order tracking information will be sent to your registered email address once shipped." },
    { q: "How to find lecture planner, class schedule and test planner?", a: "All schedules and planners are available within the 'Resources' tab on your course page. You can download them as PDFs." },
    { q: "How to change mobile number on the App?", a: "You can update your mobile number and other profile details from the 'My Profile' section, accessible from the user dropdown menu." },
];

const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => (
    <details className="group border-b border-slate-200 py-4">
        <summary className="flex items-center justify-between cursor-pointer font-semibold text-slate-800 hover:text-primary">
            {q}
            <ChevronDown className="group-open:rotate-180 transition-transform" />
        </summary>
        <p className="text-slate-600 pt-2 text-sm">{a}</p>
    </details>
);

const TicketDetailModal: React.FC<{ ticket: SupportTicket, onClose: () => void, onReply: (ticketId: string, replyText: string) => Promise<void>, onCloseTicket: (ticketId: string) => Promise<void> }> = ({ ticket, onClose, onReply, onCloseTicket }) => {
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
                    <TicketStatusBadge status={ticket.status} />
                    <div className="space-y-3">
                        <p className="text-sm text-slate-500">Conversation</p>
                        <div className="bg-slate-50 p-3 rounded-md border text-slate-700">
                             <p className="font-bold text-sm">{ticket.userName} <span className="text-slate-400 font-normal text-xs ml-1">{new Date(ticket.createdAt).toLocaleString()}</span></p>
                             <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.message}</p>
                        </div>
                        {replies.map(reply => (
                             <div key={reply.id} className={`${reply.author === 'student' ? 'bg-slate-50' : 'bg-blue-50'} p-3 rounded-md border`}>
                                <p className="font-bold text-sm">{reply.authorName} <span className="text-slate-400 font-normal text-xs ml-1">{new Date(reply.createdAt).toLocaleString()}</span></p>
                                <p className="mt-1 whitespace-pre-wrap text-sm">{reply.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 {ticket.status !== 'Closed' && (
                    <div className="p-4 border-t mt-auto">
                        <form onSubmit={handleReplySubmit} className="mb-4">
                            <label htmlFor="reply" className="font-semibold text-sm text-slate-700 mb-2 block">Your Reply</label>
                            <textarea id="reply" value={replyText} onChange={(e) => setReplyText((e.target as any).value)} rows={4} placeholder="Type your response here..." className="input-style"/>
                            <button type="submit" disabled={isReplying} className="mt-3 w-full btn-primary">
                                <Send size={16} />
                                {isReplying ? 'Sending...' : 'Send Reply'}
                            </button>
                        </form>
                         <button onClick={() => onCloseTicket(ticket.id)} className="w-full text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 font-semibold py-2 rounded-lg transition-colors">
                            Close Ticket
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const SupportPage: React.FC = () => {
    const { user } = useAuth();
    const { setHeaderTitle } = useLayout();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('help');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    useEffect(() => {
        setHeaderTitle("Help & Support");
    }, [setHeaderTitle]);

    const fetchTickets = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // FIX: Use v9 database syntax.
            const ticketsRef = ref(db, 'supportTickets');
            const q = query(ticketsRef, orderByChild('userId'), equalTo(user.id));
            const snapshot = await get(q);
            if (snapshot.exists()) {
                const ticketsData = snapshot.val();
                const ticketsList = Object.keys(ticketsData).map(key => ({
                    id: key,
                    ...ticketsData[key]
                })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setTickets(ticketsList);
            } else {
                setTickets([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'issues') {
            fetchTickets();
        } else {
            setLoading(false);
        }
    }, [user, activeTab]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!subject || !message || !user) {
            setError("Subject and message cannot be empty.");
            return;
        }
        setSubmitting(true);
        setError('');
        setSuccess('');
        try {
            // FIX: Use v9 database syntax.
            const newTicketRef = push(ref(db, 'supportTickets'));
            const now = new Date().toISOString();
            const newTicket: Omit<SupportTicket, 'id'> = {
                userId: user.id, userName: user.name, userEmail: user.email, subject, message,
                status: 'Open', createdAt: now, updatedAt: now,
            };
            await set(newTicketRef, newTicket);
            setSuccess("Your ticket has been submitted successfully!");
            setSubject('');
            setMessage('');
            fetchTickets();
        } catch (err) {
            setError("Failed to submit ticket. Please try again.");
            console.error(err);
        } finally {
            setSubmitting(false);
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
                author: 'student', authorName: user.name, text: replyText, createdAt: now
            };
            await set(newReplyRef, newReply);
            await update(ref(db, `supportTickets/${ticketId}`), { updatedAt: now });

            const newReplyWithId = { ...newReply, id: newReplyRef.key!};
            const updatedTickets = tickets.map(t => {
                if (t.id === ticketId) {
                    const updatedReplies = { ...(t.replies || {}), [newReplyWithId.id]: newReplyWithId };
                    return { ...t, replies: updatedReplies, updatedAt: now };
                }
                return t;
            });
            setTickets(updatedTickets);
            setSelectedTicket(prev => prev ? updatedTickets.find(t => t.id === prev.id) || null : null);
        } catch (error) {
            console.error("Failed to send reply:", error);
        }
    };

    const handleCloseTicket = async (ticketId: string) => {
        try {
            // FIX: Use v9 database syntax.
            await update(ref(db, `supportTickets/${ticketId}`), { status: 'Closed', updatedAt: new Date().toISOString() });
            const updatedTickets = tickets.map(t => t.id === ticketId ? { ...t, status: 'Closed' as const } : t);
            setTickets(updatedTickets);
            setSelectedTicket(null);
        } catch (error) {
            console.error("Failed to close ticket:", error);
        }
    };

    const tabs = [{ id: 'help', name: 'Help Centre' }, { id: 'issues', name: 'My Issues' }];

    return (
        <div className="opacity-0 animate-fade-in-up">
             {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onReply={handleSendReply} onCloseTicket={handleCloseTicket} />}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl p-4 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                    <div className="flex items-center gap-2">
                       {tabs.map(tab => (
                         <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}>
                            {tab.name}
                        </button>
                       ))}
                    </div>
                    <div className="relative hidden sm:block">
                       <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="text" placeholder="Type your query..." className="pl-10 pr-4 py-2 w-full text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                </div>
                
                {activeTab === 'help' && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Tell us how we can help 👋</h2>
                        {faqData.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
                    </div>
                )}
                
                {activeTab === 'issues' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Submit a New Ticket</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                 <div>
                                    <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                                    <input type="text" id="subject" value={subject} onChange={(e) => setSubject((e.target as any).value)} required className="input-style" />
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1">Message</label>
                                    <textarea id="message" value={message} onChange={(e) => setMessage((e.target as any).value)} required rows={5} className="input-style"></textarea>
                                </div>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                                {success && <p className="text-sm text-emerald-600">{success}</p>}
                                <button type="submit" disabled={submitting} className="w-full btn-primary">
                                    <Send size={16} />
                                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </form>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Ticket History</h3>
                             {loading ? <LoadingIndicator /> : (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {tickets.length > 0 ? tickets.map(ticket => (
                                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold text-sm text-slate-800 truncate pr-2">{ticket.subject}</p>
                                                <TicketStatusBadge status={ticket.status} />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                    )) : <p className="text-center text-slate-500 py-12">You have no support tickets.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SupportPage;
