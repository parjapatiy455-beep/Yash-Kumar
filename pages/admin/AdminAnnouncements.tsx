
import React, { useState, useEffect, FormEvent } from 'react';
import { Megaphone, PlusCircle, Send, Trash, Loader } from 'lucide-react';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, push, set, get, query, orderByChild, remove } from 'firebase/database';
import { Announcement } from '../../types';
import LoadingIndicator from '../../components/LoadingIndicator';

const AdminAnnouncements: React.FC = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            // FIX: Use v9 database syntax.
            const annRef = query(ref(db, 'announcements'), orderByChild('createdAt'));
            const snapshot = await get(annRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
                setAnnouncements(list);
            } else {
                setAnnouncements([]);
            }
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
            setFeedback({ message: 'Could not load existing announcements.', type: 'error'});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const clearFeedback = () => setTimeout(() => setFeedback(null), 4000);

    const handlePublish = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setFeedback({ message: 'Title and content cannot be empty.', type: 'error' });
            clearFeedback();
            return;
        }
        setSubmitting(true);
        setFeedback(null);
        try {
            // FIX: Use v9 database syntax.
            const newAnnRef = push(ref(db, 'announcements'));
            const newAnnouncement: Omit<Announcement, 'id'> = {
                title,
                content,
                createdAt: new Date().toISOString(),
                status: 'Published',
            };
            // FIX: Use v9 database syntax.
            await set(newAnnRef, newAnnouncement);
            setFeedback({ message: 'Announcement published successfully!', type: 'success' });
            setTitle('');
            setContent('');
            // Prepend new announcement to the local list for instant UI update
            setAnnouncements(prev => [{ id: newAnnRef.key!, ...newAnnouncement }, ...prev]);
        } catch (error) {
            setFeedback({ message: 'Failed to publish announcement.', type: 'error' });
            console.error(error);
        } finally {
            setSubmitting(false);
            clearFeedback();
        }
    };
    
    const handleDelete = async (id: string) => {
        if((window as any).confirm("Are you sure you want to delete this announcement?")) {
            setDeletingId(id);
             try {
                // FIX: Use v9 database syntax.
                await remove(ref(db, `announcements/${id}`));
                setAnnouncements(prev => prev.filter(a => a.id !== id));
            } catch(error) {
                console.error("Delete failed:", error);
                setFeedback({ message: 'Failed to delete announcement.', type: 'error' });
                clearFeedback();
            } finally {
                setDeletingId(null);
            }
        }
    }

    return (
        <div className="opacity-0 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Announcements</h1>

            {feedback && (
                <div className={`p-4 mb-4 rounded-lg text-sm ${
                    feedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`} role="alert">
                    <span className="font-medium">{feedback.type === 'success' ? 'Success!' : 'Error:'}</span> {feedback.message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                     <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2"><PlusCircle size={20} className="text-primary"/> New Announcement</h2>
                        <form onSubmit={handlePublish} className="space-y-4">
                            <div>
                                <label htmlFor="ann-title" className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                                <input id="ann-title" type="text" value={title} onChange={e => setTitle((e.target as any).value)} className="input-style" placeholder="e.g., New Course Launch!" required />
                            </div>
                             <div>
                                <label htmlFor="ann-content" className="block text-sm font-semibold text-slate-700 mb-1">Content</label>
                                <textarea id="ann-content" rows={6} value={content} onChange={e => setContent((e.target as any).value)} className="input-style" placeholder="Write your announcement here..." required></textarea>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-slate-500">
                                {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                                {submitting ? 'Publishing...' : 'Publish'}
                            </button>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2">
                     <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                             <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-semibold">Title</th>
                                    <th scope="col" className="px-6 py-4 font-semibold">Date Published</th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                             <tbody>
                                {loading ? (
                                    <tr><td colSpan={3}><LoadingIndicator /></td></tr>
                                ) : announcements.length > 0 ? (
                                    announcements.map(ann => (
                                        <tr key={ann.id} className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-800">{ann.title}</td>
                                            <td className="px-6 py-4">{new Date(ann.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleDelete(ann.id)} disabled={deletingId === ann.id} className="p-2 text-rose-500 hover:text-rose-700 transition-colors disabled:text-slate-400" title="Delete">
                                                    {deletingId === ann.id ? <Loader size={16} className="animate-spin" /> : <Trash size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3}>
                                            <div className="p-12 text-center text-slate-500">
                                                <Megaphone className="mx-auto text-slate-400" size={40} />
                                                <h3 className="text-lg font-semibold mt-4">No Announcements Sent</h3>
                                                <p className="text-sm mt-1">Use the form to create and send your first announcement to students.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnnouncements;
