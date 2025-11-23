
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { Link, useParams, useNavigate } = ReactRouterDom;
import { VideoProgress, Course, Material, Note, Subject, Chapter, Lecture, Doubt, Reply } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, FileText, Save, Clock, MessageCircle, Send, BrainCircuit, User, Sparkles } from 'lucide-react';
import { db } from '../../firebase';
import { ref, onValue, set, get, push } from 'firebase/database';
import CustomYouTubePlayer from '../../components/CustomYouTubePlayer';
import CustomVideoPlayer from '../../components/CustomVideoPlayer';
import { WatchPageSkeleton } from '../../components/Skeletons';
import { logoSrc } from '../../assets/logo';
import AttachmentModal from '../../components/AttachmentModal';
import CourseLock from '../../components/CourseLock';
import NoData from '../../components/NoData';
import { formatTime } from '../../utils/formatTime';
import QuizModal from '../../components/QuizModal';
import { askGeminiTutor } from '../../utils/aiHelper';
import TelegramImage from '../../components/TelegramImage';

const WatchPage: React.FC = () => {
    const { courseId, subjectId, chapterId, lectureId } = useParams<{ courseId: string; subjectId: string; chapterId: string; lectureId: string; }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const playerRef = useRef<any>(null);
    
    const [course, setCourse] = useState<Course | null>(null);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
    const [chapterMaterials, setChapterMaterials] = useState<Material[]>([]);
    const [playlist, setPlaylist] = useState<Lecture[]>([]);
    const [progress, setProgress] = useState<VideoProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('playlist');
    const [note, setNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [savedNoteTimestamp, setSavedNoteTimestamp] = useState<string | null>(null);
    const [attachmentModalLecture, setAttachmentModalLecture] = useState<Lecture | null>(null);
    const [showQuiz, setShowQuiz] = useState(false);
    
    useEffect(() => {
        if (!user || !courseId || !subjectId || !chapterId || !lectureId) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const courseRefDb = ref(db, `courses/${courseId}`);
                const subjectRefDb = ref(db, `courses/${courseId}/subjects/${subjectId}`);
                const chapterRefDb = ref(db, `courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}`);

                const [courseSnap, subjectSnap, chapterSnap] = await Promise.all([
                    get(courseRefDb), 
                    get(subjectRefDb), 
                    get(chapterRefDb)
                ]);

                if (courseSnap.exists()) setCourse({ ...courseSnap.val(), id: courseSnap.key });
                if (subjectSnap.exists()) setSubject({ ...subjectSnap.val(), id: subjectSnap.key });
                
                if (chapterSnap.exists()) {
                    const chapterData: Chapter = chapterSnap.val();
                    setChapter(chapterData);
                    const lectureList: Lecture[] = chapterData.lectures ? Object.values(chapterData.lectures).sort((a,b) => a.order - b.order) : [];
                    setPlaylist(lectureList);
                    
                    const current = lectureList.find(l => l.id === lectureId);
                    setCurrentLecture(current || null);
                    
                    const materialList: Material[] = chapterData.materials ? Object.values(chapterData.materials) : [];
                    setChapterMaterials(materialList);
                }
            } catch (error) {
                console.error("Error fetching video data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        const progressRefDb = ref(db, `progress/${user.id}/${lectureId}`);
        const unsubscribeProgress = onValue(progressRefDb, (snap) => setProgress(snap.val()));

        const noteRefDb = ref(db, `notes/${user.id}/${lectureId}`);
        const unsubscribeNote = onValue(noteRefDb, (snap) => {
            if (snap.exists()) {
                const noteData = snap.val();
                setNote(noteData.text);
                if (noteData.timestamp !== undefined) {
                    setSavedNoteTimestamp(formatTime(noteData.timestamp));
                }
            } else {
                setNote('');
                setSavedNoteTimestamp(null);
            }
        });

        return () => {
            unsubscribeProgress();
            unsubscribeNote();
        };
    }, [lectureId, chapterId, subjectId, courseId, user, navigate]);

    const onPlayerReady = useCallback((player: any) => {
        playerRef.current = player;
        if (progress?.lastTime) {
             if (typeof player.seekTo === 'function') {
                player.seekTo(progress.lastTime);
             }
        }
    }, [progress]);

    const saveProgress = useCallback(() => {
        if (playerRef.current && user && lectureId) {
            const currentTime = typeof playerRef.current.getCurrentTime === 'function' 
                ? playerRef.current.getCurrentTime() 
                : 0;

            if (currentTime > 0) {
                const progressRefDb = ref(db, `progress/${user.id}/${lectureId}`);
                set(progressRefDb, { userId: user.id, videoId: lectureId, lastTime: currentTime });
            }
        }
    }, [user, lectureId]);
    
    const handleSaveNote = useCallback(async () => {
        if (!user || !lectureId || !courseId) return;
        setSavingNote(true);
        
        // Capture current timestamp from player safely
        let currentTime = 0;
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            currentTime = playerRef.current.getCurrentTime();
        }

        const noteRefDb = ref(db, `notes/${user.id}/${lectureId}`);
        const newNote: Omit<Note, 'id'> = {
            userId: user.id, 
            videoId: lectureId, 
            courseId: courseId, 
            text: note, 
            timestamp: currentTime,
            updatedAt: new Date().toISOString()
        };
        try {
            await set(noteRefDb, newNote);
            setSavedNoteTimestamp(formatTime(currentTime));
        } catch (error) {
            console.error("Failed to save note", error);
        } finally {
            setTimeout(() => setSavingNote(false), 1000);
        }
    }, [user, lectureId, courseId, note]);
    
    if (loading) return <WatchPageSkeleton />;

    const isEnrolled = user?.enrolledCourses.includes(courseId!);
    const isPaidCourse = course && course.price > 0;

    if (isPaidCourse && !isEnrolled) {
        return <CourseLock course={course} />;
    }
    
    if (!currentLecture || !course) return <div className="h-screen bg-light text-slate-800 flex items-center justify-center">Lecture or Course not found</div>;

    const isYouTube = currentLecture.videoType === 'youtube' || (!currentLecture.videoType && currentLecture.youtubeId);

    const aiContext = {
        courseName: course?.title,
        subjectName: subject?.title,
        chapterName: chapter?.title,
        lectureTitle: currentLecture?.title
    };

    return (
        <div className="h-screen bg-light flex flex-col font-sans overflow-hidden">
            {attachmentModalLecture && (
                <AttachmentModal 
                    lecture={attachmentModalLecture} 
                    onClose={() => setAttachmentModalLecture(null)}
                    courseId={courseId!}
                    subjectId={subjectId!}
                    chapterId={chapterId!}
                />
            )}
            {showQuiz && chapter?.quiz && (
                <QuizModal quiz={chapter.quiz} onClose={() => setShowQuiz(false)} />
            )}

            <header className="bg-white flex-shrink-0 z-10 p-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/course/${courseId}/subject/${subjectId}`)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary font-semibold transition-colors">
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Back to </span><span className="font-bold truncate max-w-xs text-slate-800">{course.title}</span>
                    </button>
                </div>
                <div className="text-right flex items-center gap-4">
                     {chapter?.quiz && (
                         <button onClick={() => setShowQuiz(true)} className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5">
                             <BrainCircuit size={16} /> Take Quiz
                         </button>
                     )}
                     <p className="font-semibold text-slate-700 text-sm hidden sm:block">{user?.name}</p>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <main className="flex-1 flex flex-col bg-black lg:bg-transparent lg:p-4 lg:pb-0">
                    <div className="w-full aspect-video bg-black lg:rounded-xl lg:shadow-lg overflow-hidden flex-shrink-0">
                        {isYouTube ? (
                            <CustomYouTubePlayer 
                                videoId={currentLecture.youtubeId!} 
                                onPlayerReady={onPlayerReady}
                                onProgress={saveProgress}
                            />
                        ) : (
                            <CustomVideoPlayer
                                videoUrl={currentLecture.videoUrl!}
                                thumbnail={currentLecture.thumbnail}
                                onPlayerReady={onPlayerReady}
                                onProgress={saveProgress}
                            />
                        )}
                    </div>
                    
                    {/* Mobile Tabs Container - Visible Only on Mobile */}
                    <div className="flex-1 bg-white border-t border-slate-200 flex flex-col lg:hidden overflow-hidden">
                        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 bg-white">
                             <div className="flex items-start gap-3">
                                <img src={logoSrc} alt="Course Logo" className="w-10 h-10 rounded-lg" />
                                <div className="flex-1">
                                    <h1 className="text-base font-bold text-slate-800 leading-tight line-clamp-2">{currentLecture.title}</h1>
                                    {chapter?.quiz && (
                                        <button onClick={() => setShowQuiz(true)} className="mt-2 flex items-center gap-1 text-purple-600 font-bold text-xs bg-purple-50 px-2 py-1 rounded-full w-fit">
                                            <BrainCircuit size={12} /> Take Quiz
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex border-b border-slate-200 text-xs font-semibold overflow-x-auto no-scrollbar bg-white flex-shrink-0">
                            <TabButton id="playlist" activeTab={activeTab} setActiveTab={setActiveTab}>Playlist</TabButton>
                            <TabButton id="ai-tutor" activeTab={activeTab} setActiveTab={setActiveTab}><span className="flex items-center gap-1"><Sparkles size={12} className="text-purple-500"/> AI Tutor</span></TabButton>
                            <TabButton id="doubts" activeTab={activeTab} setActiveTab={setActiveTab}>Doubts</TabButton>
                            <TabButton id="attachments" activeTab={activeTab} setActiveTab={setActiveTab}>PDFs</TabButton>
                            <TabButton id="notes" activeTab={activeTab} setActiveTab={setActiveTab}>Notes</TabButton>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            {activeTab === 'playlist' && <Playlist lectures={playlist} courseId={courseId!} subjectId={subjectId!} chapterId={chapterId!} currentLectureId={lectureId!} onAttachmentClick={setAttachmentModalLecture} />}
                            {activeTab === 'attachments' && <AttachmentsPanel lectureMaterials={Object.values(currentLecture.materials || {})} chapterMaterials={chapterMaterials} courseId={courseId!} subjectId={subjectId!} chapterId={chapterId!} lectureId={lectureId!} />}
                            {activeTab === 'notes' && <NotesPanel note={note} setNote={setNote} handleSaveNote={handleSaveNote} saving={savingNote} timestamp={savedNoteTimestamp} />}
                            {activeTab === 'doubts' && <DoubtsPanel lectureId={lectureId!} />}
                            {activeTab === 'ai-tutor' && <AITutorPanel context={aiContext} />}
                        </div>
                    </div>
                </main>
                
                {/* Desktop Sidebar - Hidden on Mobile */}
                <aside className="hidden lg:flex lg:flex-col lg:w-[400px] lg:border-l border-slate-200 bg-white h-full shadow-xl z-20">
                    <div className="p-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 line-clamp-2">{currentLecture.title}</h2>
                    </div>
                    <div className="flex border-b border-slate-200 text-sm font-semibold bg-slate-50">
                        <TabButton id="playlist" activeTab={activeTab} setActiveTab={setActiveTab}>Playlist</TabButton>
                         <TabButton id="ai-tutor" activeTab={activeTab} setActiveTab={setActiveTab}><span className="flex items-center gap-1"><Sparkles size={14} className="text-purple-500"/> AI Tutor</span></TabButton>
                        <TabButton id="doubts" activeTab={activeTab} setActiveTab={setActiveTab}>Doubts</TabButton>
                        <TabButton id="attachments" activeTab={activeTab} setActiveTab={setActiveTab}>PDFs</TabButton>
                        <TabButton id="notes" activeTab={activeTab} setActiveTab={setActiveTab}>Notes</TabButton>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                         {activeTab === 'playlist' && <Playlist lectures={playlist} courseId={courseId!} subjectId={subjectId!} chapterId={chapterId!} currentLectureId={lectureId!} onAttachmentClick={setAttachmentModalLecture} />}
                         {activeTab === 'attachments' && <AttachmentsPanel lectureMaterials={Object.values(currentLecture.materials || {})} chapterMaterials={chapterMaterials} courseId={courseId!} subjectId={subjectId!} chapterId={chapterId!} lectureId={lectureId!} />}
                         {activeTab === 'notes' && <NotesPanel note={note} setNote={setNote} handleSaveNote={handleSaveNote} saving={savingNote} timestamp={savedNoteTimestamp} />}
                         {activeTab === 'doubts' && <DoubtsPanel lectureId={lectureId!} />}
                         {activeTab === 'ai-tutor' && <AITutorPanel context={aiContext} />}
                    </div>
                </aside>
            </div>
        </div>
    );
};

const TabButton: React.FC<{id: string, activeTab: string, setActiveTab: (id: string) => void, children: React.ReactNode}> = ({id, activeTab, setActiveTab, children}) => (
    <button onClick={() => setActiveTab(id)} className={`flex-1 p-3 transition-colors relative whitespace-nowrap text-center ${activeTab === id ? 'text-primary bg-indigo-50/50 font-bold' : 'text-slate-500 hover:text-slate-800'}`}>
        {children}
        {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
    </button>
)

const Playlist: React.FC<{lectures: Lecture[], courseId: string, subjectId: string, chapterId: string, currentLectureId: string, onAttachmentClick: (lecture: Lecture) => void}> = ({ lectures, courseId, subjectId, chapterId, currentLectureId, onAttachmentClick }) => {
    if (lectures.length === 0) {
        return <NoData message="No lectures available" className="py-8" />;
    }
    return (
        <div className='divide-y divide-slate-100'>
            {lectures.map(lecture => {
                const hasAttachments = lecture.materials && Object.keys(lecture.materials).length > 0;
                const isYouTube = lecture.videoType === 'youtube' || (!lecture.videoType && lecture.youtubeId);
                const thumbnailSrc = lecture.thumbnail || (isYouTube && lecture.youtubeId ? `https://i.ytimg.com/vi/${lecture.youtubeId}/mqdefault.jpg` : undefined);

                return (
                    <Link key={lecture.id} to={`/course/${courseId}/subject/${subjectId}/chapter/${chapterId}/video/${lecture.id}`} className={`block p-3 transition-colors ${lecture.id === currentLectureId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-start gap-3">
                            <div className="w-24 h-16 flex-shrink-0 bg-slate-200 rounded-md overflow-hidden relative">
                                <TelegramImage 
                                    src={thumbnailSrc}
                                    alt={lecture.title} 
                                    className={`w-full h-full object-cover ${!isYouTube && !lecture.thumbnail && 'p-4 opacity-50'}`}
                                    skeleton={<div className="w-full h-full bg-slate-200 animate-pulse"/>}
                                />
                                {!isYouTube && !lecture.thumbnail && <div className="absolute inset-0 flex items-center justify-center font-bold text-[10px] text-slate-500">VIDEO</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm leading-tight mb-1 line-clamp-2 ${lecture.id === currentLectureId ? 'text-primary' : 'text-slate-800'}`}>{lecture.title}</p>
                                <p className="text-xs text-slate-500">{lecture.duration}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold uppercase ${lecture.id === currentLectureId ? 'text-primary' : 'text-slate-500'}`}>
                                        {lecture.id === currentLectureId ? 'Playing' : 'Play'}
                                    </span>
                                    {hasAttachments && (
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAttachmentClick(lecture); }} className="text-slate-400 hover:text-primary">
                                            <FileText size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}

const NotesPanel: React.FC<{note: string, setNote: (val: string) => void, handleSaveNote: () => void, saving: boolean, timestamp: string | null}> = ({note, setNote, handleSaveNote, saving, timestamp}) => (
    <div className='p-4 h-full flex flex-col'>
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500">Your Class Notes</span>
            {timestamp && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1"><Clock size={12}/> Saved at {timestamp}</span>}
        </div>
        <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type your notes for this video here. Click save to bookmark the current video time."
            className="w-full flex-1 bg-white border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
        />
        <button onClick={handleSaveNote} disabled={saving} className="mt-3 w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-slate-600">
            <Save size={16} />
            {saving ? 'Saved!' : 'Save Note & Timestamp'}
        </button>
    </div>
)

const DoubtsPanel: React.FC<{ lectureId: string }> = ({ lectureId }) => {
    const { user } = useAuth();
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [newDoubt, setNewDoubt] = useState('');
    const [sending, setSending] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const doubtsRef = ref(db, `doubts/${lectureId}`);
        return onValue(doubtsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                setDoubts(list);
                // Auto scroll to bottom
                setTimeout(() => {
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                }, 100);
            } else {
                setDoubts([]);
            }
        });
    }, [lectureId]);

    const handlePostDoubt = async () => {
        if (!newDoubt.trim() || !user) return;
        setSending(true);
        try {
            const newRef = push(ref(db, `doubts/${lectureId}`));
            await set(newRef, {
                id: newRef.key,
                userId: user.id,
                userName: user.name,
                text: newDoubt,
                createdAt: new Date().toISOString()
            });
            setNewDoubt('');
        } catch (e) { console.error(e); }
        setSending(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {doubts.length > 0 ? doubts.map(d => (
                    <div key={d.id} className={`flex flex-col ${d.userId === user?.id ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${d.userId === user?.id ? 'bg-white text-slate-800 rounded-br-none border border-slate-200' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'}`}>
                            <div className="flex justify-between items-baseline gap-2 mb-1">
                                <span className={`font-bold text-xs ${d.userId === user?.id ? 'text-primary' : 'text-orange-600'}`}>{d.userName}</span>
                                <span className="text-[10px] text-slate-400">{new Date(d.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-sm leading-relaxed">{d.text}</p>
                        </div>
                        
                        {/* Replies Thread */}
                        {d.replies && Object.values(d.replies).map((r: Reply) => (
                            <div key={r.id} className="mt-2 ml-4 max-w-[80%] bg-indigo-50 p-2 rounded-lg border border-indigo-100 text-xs">
                                <div className="flex items-center gap-1 font-bold text-indigo-700 mb-1">
                                    <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[8px]">{r.authorName[0]}</div>
                                    {r.authorName}
                                </div>
                                <p className="text-slate-700">{r.text}</p>
                            </div>
                        ))}
                    </div>
                )) : <div className="text-center text-slate-400 py-10 text-sm flex flex-col items-center gap-2"><MessageCircle size={32} className="opacity-20"/>No doubts asked yet.</div>}
            </div>
            <div className="p-3 bg-white border-t border-slate-200">
                <div className="flex gap-2 items-center bg-slate-100 rounded-full px-2 py-1 border border-slate-200 focus-within:ring-2 focus-within:ring-primary/50 focus-within:bg-white transition-all">
                    <input 
                        value={newDoubt} 
                        onChange={e => setNewDoubt(e.target.value)}
                        placeholder="Ask a doubt..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-2"
                        onKeyDown={e => e.key === 'Enter' && handlePostDoubt()}
                    />
                    <button onClick={handlePostDoubt} disabled={sending} className="p-2 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-transform hover:scale-105">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AITutorPanel: React.FC<{ context: { courseName?: string, subjectName?: string, chapterName?: string, lectureTitle?: string } }> = ({ context }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        
        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        const response = await askGeminiTutor(userMessage, context);
        
        setMessages(prev => [...prev, { role: 'model', text: response }]);
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
                 <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-purple-200 rounded-full blur-3xl"></div>
                 <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 bg-blue-200 rounded-full blur-3xl"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10">
                {messages.length === 0 && (
                    <div className="text-center py-12 animate-fade-in">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                            <BrainCircuit size={32} className="text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">AI Tutor</h3>
                        <p className="text-sm text-slate-500 max-w-[240px] mx-auto">
                            Ask me anything about this lecture! I can explain concepts, solve problems, or summarize key points.
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start gap-3 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-gradient-to-br from-purple-500 to-indigo-600'}`}>
                            {msg.role === 'user' ? <User size={16} className="text-indigo-700"/> : <Sparkles size={16} className="text-white"/>}
                         </div>
                         <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                             msg.role === 'user' 
                             ? 'bg-indigo-600 text-white rounded-tr-none' 
                             : 'bg-white text-slate-800 border border-purple-100 rounded-tl-none'
                         }`}>
                             {msg.text}
                         </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-start gap-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                             <Sparkles size={16} className="text-white animate-pulse"/>
                        </div>
                        <div className="bg-white border border-purple-100 p-3.5 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-200 relative z-10">
                <div className="flex gap-2 items-center bg-slate-100 rounded-full px-2 py-1 border border-slate-200 focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500/50 focus-within:bg-white transition-all">
                    <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask AI Tutor..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-2"
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                        onClick={handleSendMessage} 
                        disabled={isLoading || !input.trim()} 
                        className="p-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg disabled:opacity-50 transition-transform hover:scale-105"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AttachmentsPanel: React.FC<{lectureMaterials: Material[], chapterMaterials: Material[], courseId: string, subjectId: string, chapterId: string, lectureId: string}> = ({lectureMaterials, chapterMaterials, courseId, subjectId, chapterId, lectureId}) => (
     <div className='p-2 space-y-1.5'>
        {lectureMaterials.length > 0 && (
            <div className="mb-4">
                <h3 className="px-3 py-1 font-semibold text-sm text-slate-800">For this Lecture</h3>
                 {lectureMaterials.map(material => (
                    <Link key={material.id} to={`/course/${courseId}/subject/${subjectId}/chapter/${chapterId}/pdf/${material.id}?lectureId=${lectureId}`} target="_blank" className="flex items-center gap-3 p-3 rounded-md transition-colors hover:bg-slate-100">
                        <FileText size={20} className="text-primary flex-shrink-0" />
                        <p className="text-sm font-medium text-slate-700 truncate">{material.filename}</p>
                    </Link>
                ))}
            </div>
        )}
        {chapterMaterials.length > 0 && (
             <div>
                <h3 className="px-3 py-1 font-semibold text-sm text-slate-800">For this Chapter</h3>
                {chapterMaterials.map(material => (
                    <Link key={material.id} to={`/course/${courseId}/subject/${subjectId}/chapter/${chapterId}/pdf/${material.id}`} target="_blank" className="flex items-center gap-3 p-3 rounded-md transition-colors hover:bg-slate-100">
                        <FileText size={20} className="text-primary flex-shrink-0" />
                        <p className="text-sm font-medium text-slate-700 truncate">{material.filename}</p>
                    </Link>
                ))}
            </div>
        )}
        {lectureMaterials.length === 0 && chapterMaterials.length === 0 && (
            <NoData message="No attachments available" className="py-8" />
        )}
    </div>
)

export default WatchPage;
