


import React, { useState, useEffect } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { Link, useParams } = ReactRouterDom;
import { db } from '../../firebase';
import { ref, get } from 'firebase/database';
import { Subject, Chapter, Lecture, Material, Course } from '../../types';
import { useLayout } from '../../components/StudentLayout';
import { useAuth } from '../../context/AuthContext';
import { ChevronRight, BookOpen, FileText, CheckCircle, PlayCircle } from 'lucide-react';
import { CourseDetailSkeleton } from '../../components/Skeletons';
import AttachmentModal from '../../components/AttachmentModal';
import TelegramImage from '../../components/TelegramImage';
import CourseLock from '../../components/CourseLock';
import NoData from '../../components/NoData';
import { logoSrc } from '../../assets/logo';

const SubjectPage: React.FC = () => {
    const { courseId, subjectId } = useParams<{ courseId: string; subjectId: string }>();
    const { setHeaderTitle } = useLayout();
    const { user } = useAuth();
    
    const [course, setCourse] = useState<Course | null>(null);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [allLectures, setAllLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Chapters');
    const [attachmentModalLecture, setAttachmentModalLecture] = useState<Lecture | null>(null);

    useEffect(() => {
        if (!courseId || !subjectId) return;

        const fetchSubjectData = async () => {
            setLoading(true);
            try {
                const courseRef = ref(db, `courses/${courseId}`);
                const subjectRef = ref(db, `courses/${courseId}/subjects/${subjectId}`);
                
                const [courseSnap, subjectSnap] = await Promise.all([get(courseRef), get(subjectRef)]);

                if (courseSnap.exists()) {
                    setCourse({ ...courseSnap.val(), id: courseSnap.key });
                }

                if (subjectSnap.exists()) {
                    const subjectData = subjectSnap.val();
                    setSubject(subjectData);
                    setHeaderTitle(subjectData.title);
                    if (subjectData.chapters) {
                        const chap: Chapter[] = Object.values(subjectData.chapters) as Chapter[];
                        const sortedChapters = chap.sort((a,b) => a.order - b.order);
                        setChapters(sortedChapters);
                        
                        const lectures = sortedChapters.flatMap(ch => ch.lectures ? Object.values(ch.lectures) as Lecture[] : []);
                        setAllLectures(lectures.sort((a,b) => a.order - b.order));
                    }
                } else {
                    setHeaderTitle("Subject Not Found");
                }
            } catch (error) {
                console.error("Failed to fetch subject details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubjectData();
    }, [courseId, subjectId, setHeaderTitle]);
    
    const isEnrolled = user?.enrolledCourses.includes(courseId!);
    const isPaidCourse = course && course.price > 0;

    if (loading) {
        return <CourseDetailSkeleton />;
    }

    if (isPaidCourse && !isEnrolled) {
        return <div className="p-0 -m-8"><CourseLock course={course} /></div>;
    }

    if (!subject) {
        return <div className="text-center p-8">Subject not found.</div>;
    }
    
    const findChapterIdForLecture = (lectureId: string) => {
        for (const chapter of chapters) {
            if (chapter.lectures && chapter.lectures[lectureId]) {
                return chapter.id;
            }
        }
        return null;
    }

    const allMaterials = chapters.flatMap(ch => ch.materials ? (Object.values(ch.materials) as Material[]).map(m => ({...m, chapterTitle: ch.title})) : []);

    return (
        <div className="opacity-0 animate-fade-in-up">
            {attachmentModalLecture && (
                <AttachmentModal 
                    lecture={attachmentModalLecture}
                    onClose={() => setAttachmentModalLecture(null)}
                    courseId={courseId!}
                    subjectId={subjectId!}
                    chapterId={findChapterIdForLecture(attachmentModalLecture.id)!}
                />
            )}
            <div className="bg-white p-4 rounded-t-xl border-x border-t border-slate-200/80 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-slate-800">{subject.title}</h1>
                <div className="flex items-center gap-2 text-sm font-semibold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
                    <span className="font-mono bg-white/60 rounded-full px-2 py-0.5">XP</span>
                    <span>5734</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-b-xl border border-slate-200/80 shadow-lg">
                <div className="border-b border-slate-200 mb-6">
                    <nav className="flex gap-4 -mb-px">
                        <button onClick={() => setActiveTab('Chapters')} className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'Chapters' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-800'}`}>Chapters</button>
                        <button onClick={() => setActiveTab('Lectures')} className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'Lectures' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-800'}`}>Lectures</button>
                        <button onClick={() => setActiveTab('Study Material')} className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'Study Material' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-800'}`}>Study Material</button>
                    </nav>
                </div>
                {activeTab === 'Chapters' && (
                    chapters.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {chapters.map(chapter => {
                                const lectures = chapter.lectures ? Object.values(chapter.lectures) : [];
                                const materials = chapter.materials ? Object.values(chapter.materials) : [];
                                const firstLectureId = lectures.length > 0 ? (lectures[0] as Lecture).id : null;
                                const linkTo = firstLectureId ? `/course/${courseId}/subject/${subjectId}/chapter/${chapter.id}/video/${firstLectureId}` : '#';

                                return (
                                    <Link to={linkTo} key={chapter.id} className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-primary transition-all duration-300 flex flex-col group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">CH-{String(chapter.order).padStart(2, '0')}</span>
                                            <ChevronRight size={20} className="text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-lg mb-3 flex-grow">{chapter.title}</h3>
                                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-3 mt-auto pt-2 border-t border-slate-100">
                                            <span>Lecture: 0/{lectures.length}</span>
                                            <span>DPP: 0/{materials.length}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : <NoData message="No chapters available" />
                )}
                {activeTab === 'Lectures' && (
                    allLectures.length > 0 ? (
                     <div className="space-y-3">
                        {allLectures.map(lecture => {
                             const chapterId = findChapterIdForLecture(lecture.id);
                             if (!chapterId) return null;
                             const linkTo = `/course/${courseId}/subject/${subjectId}/chapter/${chapterId}/video/${lecture.id}`;
                             const hasAttachments = lecture.materials && Object.keys(lecture.materials).length > 0;
                             const isYouTube = lecture.videoType === 'youtube' || (!lecture.videoType && lecture.youtubeId);
                             const thumbnailSrc = lecture.thumbnail || (isYouTube && lecture.youtubeId ? `https://i.ytimg.com/vi/${lecture.youtubeId}/mqdefault.jpg` : undefined);

                             return (
                                <div key={lecture.id} className="bg-white p-3 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                                    <Link to={linkTo} className="w-32 h-20 rounded-lg flex-shrink-0 overflow-hidden relative bg-slate-100">
                                         <TelegramImage 
                                            src={thumbnailSrc} 
                                            alt={lecture.title} 
                                            className={`w-full h-full object-cover ${!isYouTube && !lecture.thumbnail && 'p-4 opacity-50'}`} 
                                            skeleton={<div className="w-full h-full bg-slate-200 animate-pulse"/>}
                                         />
                                         {!isYouTube && !lecture.thumbnail && <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-slate-500">VIDEO</div>}
                                         <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                                            {lecture.duration}
                                         </div>
                                    </Link>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 mb-1">Lecture • {lecture.date || 'Aug 7'}</p>
                                        <h4 className="font-semibold text-slate-800 leading-snug mb-2">{lecture.title}</h4>
                                        <div className="flex items-center gap-4">
                                             <Link to={linkTo} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark">
                                                <PlayCircle size={16} /> View Lecture
                                            </Link>
                                            {hasAttachments && (
                                                <button onClick={() => setAttachmentModalLecture(lecture)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary">
                                                    <FileText size={16} /> Attachments
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
                                </div>
                             )
                        })}
                     </div>
                    ) : <NoData message="No lectures found" />
                )}
                 {activeTab === 'Study Material' && (
                    <div className="space-y-3">
                        {allMaterials.length > 0 ? allMaterials.map(material => {
                            const chapter = chapters.find(c => c.title === material.chapterTitle);
                            return (
                                <Link to={`/course/${courseId}/subject/${subjectId}/chapter/${chapter?.id}/pdf/${material.id}`} key={material.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-100/80 transition-colors border">
                                    <FileText className="text-primary flex-shrink-0" size={24} />
                                    <div>
                                        <p className="font-medium text-sm text-slate-700">{material.filename}</p>
                                        <p className="text-xs text-slate-500">{material.chapterTitle}</p>
                                    </div>
                                </Link>
                            )
                        }) : <NoData message="No study materials available" />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectPage;