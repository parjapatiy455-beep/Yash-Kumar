
import React, { useState, useEffect, useCallback } from 'react';
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDom;
import { Subject, Chapter } from '../../types';
import { ArrowLeft, PlusCircle, Trash, Save, GripVertical, Edit2 } from 'lucide-react';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, set, get, push } from 'firebase/database';
import LoadingIndicator from '../../components/LoadingIndicator';

// Main Page Component
const SubjectEditPage: React.FC = () => {
    const { courseId, subjectId } = useParams<{ courseId: string; subjectId: string }>();
    const navigate = useNavigate();
    const [subject, setSubject] = useState<Subject | null>(null);
    const [courseTitle, setCourseTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');
    const [newChapterTitle, setNewChapterTitle] = useState('');

    const fetchSubject = useCallback(async () => {
        if (!courseId || !subjectId) return;
        setLoading(true);
        try {
            // FIX: Use v9 database syntax.
            const courseRefDb = ref(db, `courses/${courseId}`);
            const subjectRefDb = ref(db, `courses/${courseId}/subjects/${subjectId}`);
            const [courseSnap, subjectSnap] = await Promise.all([get(courseRefDb), get(subjectRefDb)]);

            if (courseSnap.exists()) setCourseTitle(courseSnap.val().title);
            if (subjectSnap.exists()) {
                setSubject({ ...subjectSnap.val(), chapters: subjectSnap.val().chapters || {} });
            }
        } catch (error) {
            console.error("Failed to fetch subject data", error);
        } finally {
            setLoading(false);
        }
    }, [courseId, subjectId]);

    useEffect(() => {
        fetchSubject();
    }, [fetchSubject]);

    const handleSave = useCallback(async (updatedSubject?: Subject, message?: string) => {
        const subjectToSave = updatedSubject || subject;
        if (!courseId || !subjectId || !subjectToSave) return;
        setSaveStatus('Saving...');
        try {
            // FIX: Use v9 database syntax.
            await set(ref(db, `courses/${courseId}/subjects/${subjectId}`), subjectToSave);
            setSaveStatus(message || 'Content saved successfully!');
        } catch (err) {
            setSaveStatus(`Error: ${(err as Error).message}`);
        } finally {
            setTimeout(() => setSaveStatus(''), 3000);
        }
    }, [courseId, subjectId, subject]);
    
    const handleChaptersUpdate = (chapters: Record<string, Chapter>, message: string) => {
        if (!subject) return;
        const updatedSubject = { ...subject, chapters };
        setSubject(updatedSubject);
        handleSave(updatedSubject, message);
    };

    const handleAddChapter = () => {
        if (!newChapterTitle.trim()) return;
        const chapters = subject?.chapters || {};
        // FIX: Use v9 database syntax.
        const newId = push(ref(db, 'temp')).key!;
        const newChapter: Chapter = { id: newId, title: newChapterTitle, order: Object.keys(chapters).length + 1 };
        handleChaptersUpdate({ ...chapters, [newId]: newChapter }, 'Chapter added!');
        setNewChapterTitle('');
    };

    const handleDeleteChapter = (chapterId: string) => {
        if (!subject?.chapters) return;
        if ((window as any).confirm("Are you sure you want to delete this chapter and all its content?")) {
            const { [chapterId]: _, ...rest } = subject.chapters;
            handleChaptersUpdate(rest, 'Chapter deleted!');
        }
    };
    
    if (loading || !subject) return <LoadingIndicator fullscreen />;

    return (
        <div className="min-h-screen bg-light font-sans">
            <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 p-4 border-b border-slate-200/80 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/admin/courses/${courseId}`)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary font-semibold transition-colors">
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Back to </span><span className="font-bold truncate max-w-xs text-slate-800">{courseTitle}</span>
                    </button>
                    <div className="h-6 border-l border-slate-300"></div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800">{subject.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    {saveStatus && <p className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg">{saveStatus}</p>}
                    <button onClick={() => handleSave()} className="btn-primary"><Save size={18}/> Save Changes</button>
                </div>
            </header>
            
            <main className="p-4 sm:p-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md space-y-6">
                        <h2 className="text-xl font-semibold text-slate-800 border-b pb-3">Manage Chapters</h2>
                        
                        <div className="border-b border-slate-200/80 pb-6">
                          <h3 className="font-semibold text-slate-700 mb-2 text-base">Add New Chapter</h3>
                          <div className="flex flex-col sm:flex-row gap-2">
                              <input id="chapter-title" value={newChapterTitle} onChange={e => setNewChapterTitle((e.target as any).value)} placeholder="e.g., Introduction to Kinematics" className="input-style flex-grow"/>
                              <button onClick={handleAddChapter} className="btn-secondary flex-shrink-0"><PlusCircle size={18}/> Add Chapter</button>
                          </div>
                        </div>

                        <div className="space-y-3">
                            {(subject.chapters ? (Object.values(subject.chapters) as Chapter[]) : []).sort((a,b)=>a.order-b.order).map(ch => (
                                <div key={ch.id} className="bg-slate-50 border rounded-lg flex items-center p-3">
                                    <GripVertical className="cursor-move text-slate-400"/>
                                    <span className="font-semibold text-slate-800 ml-2 flex-1">{ch.title}</span>
                                    <div className="flex items-center ml-auto gap-2">
                                        <button onClick={() => navigate(`/admin/courses/${courseId}/subjects/${subjectId}/chapters/${ch.id}`)} className="btn-secondary px-4 py-1.5 text-sm"><Edit2 size={14}/> Manage Content</button>
                                        <button onClick={() => handleDeleteChapter(ch.id)} className="delete-btn"><Trash size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(subject.chapters || {}).length === 0 && (
                                <p className="text-center text-slate-500 py-6">No chapters added yet. Add one above to get started.</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SubjectEditPage;
