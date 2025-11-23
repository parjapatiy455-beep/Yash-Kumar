
import React, { useState, useEffect, useRef } from 'react';
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { Link } = ReactRouterDom;
import { useAuth } from '../../context/AuthContext';
import { Course, Lecture, Subject, Chapter, Announcement } from '../../types';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, get, query, limitToLast, orderByChild } from 'firebase/database';
import { CourseCardSkeleton } from '../../components/Skeletons';
import { PlayCircle, ChevronDown, Star, Megaphone, X, FileText, Clock, Loader2, Radio } from 'lucide-react';
import { useLayout } from '../../components/StudentLayout';
import TelegramImage from '../../components/TelegramImage';
import AttachmentModal from '../../components/AttachmentModal';
import { logoSrc } from '../../assets/logo';

const StudyPage: React.FC = () => {
  const { user } = useAuth();
  const { setHeaderTitle } = useLayout();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [todaysClasses, setTodaysClasses] = useState<{ course: Course, subjectId: string, chapterId: string, lecture: Lecture }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [attachmentModalData, setAttachmentModalData] = useState<{ course: Course, subjectId: string, chapterId: string, lecture: Lecture } | null>(null);
  const [isCourseSelectorOpen, setIsCourseSelectorOpen] = useState(false);
  const courseSelectorRef = useRef<HTMLDivElement>(null);
  
  // Delay state for live classes
  const [liveDelayPassed, setLiveDelayPassed] = useState(false);


  useEffect(() => {
    setHeaderTitle('Study');
    // Start 15s timer for live class reveal
    const timer = setTimeout(() => {
        setLiveDelayPassed(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [setHeaderTitle]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      if (!user || !user.enrolledCourses || user.enrolledCourses.length === 0) {
        setEnrolledCourses([]);
        setLoading(false);
        return;
      }

      try {
        const coursePromises = user.enrolledCourses.map(courseId => 
          get(ref(db, `courses/${courseId}`))
        );
        const courseSnapshots = await Promise.all(coursePromises);
        const coursesData: Course[] = courseSnapshots
          .filter(snap => snap.exists())
          .map(snap => ({ ...snap.val(), id: snap.key! }));
          
        setEnrolledCourses(coursesData);
        
        if (coursesData.length > 0) {
          const savedCourseId = (window as any).localStorage.getItem('vedpath-selected-course-id');
          const savedCourse = coursesData.find(c => c.id === savedCourseId);
          setSelectedCourse(savedCourse || coursesData[0]);
        }

      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAnnouncement = async () => {
        try {
            // FIX: Use v9 database syntax.
            const announcementsRef = query(ref(db, 'announcements'), orderByChild('createdAt'), limitToLast(1));
            const snapshot = await get(announcementsRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                const annId = Object.keys(data)[0];
                const latestAnnouncement: Announcement = { id: annId, ...data[annId] };
                
                if (latestAnnouncement) {
                    setAnnouncement(latestAnnouncement);
                    const dismissedId = (window as any).localStorage.getItem('dismissedAnnouncementId');
                    if (dismissedId !== latestAnnouncement.id) {
                        setShowAnnouncement(true);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch announcement:", error);
        }
    };
    
    fetchInitialData();
    fetchAnnouncement();
  }, [user]);

  useEffect(() => {
      if (selectedCourse) {
          const allLectures: { course: Course, subjectId: string, chapterId: string, lecture: Lecture }[] = [];
          if (selectedCourse.subjects) {
              for (const subjectId in selectedCourse.subjects) {
                const subject = selectedCourse.subjects[subjectId];
                  if (subject.chapters) {
                      for (const chapterId in subject.chapters) {
                        const chapter = subject.chapters[chapterId];
                          if (chapter.lectures) {
                              for (const lectureId in chapter.lectures) {
                                const lecture = chapter.lectures[lectureId];
                                  allLectures.push({ course: selectedCourse, subjectId: subject.id, chapterId: chapter.id, lecture });
                              }
                          }
                      }
                  }
              }
          }
          // Sort by date/time if available, or order. Prioritize LIVE.
          const latestLectures = allLectures.sort((a, b) => {
              if (a.lecture.isLive && !b.lecture.isLive) return -1;
              if (!a.lecture.isLive && b.lecture.isLive) return 1;
              return (b.lecture.order || 0) - (a.lecture.order || 0);
          }).slice(0, 6);
          setTodaysClasses(latestLectures);
      } else {
          setTodaysClasses([]);
      }
  }, [selectedCourse]);

   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (courseSelectorRef.current && !(courseSelectorRef.current as any).contains(event.target as any)) {
        setIsCourseSelectorOpen(false);
      }
    };
    (window as any).document.addEventListener("mousedown", handleClickOutside);
    return () => (window as any).document.removeEventListener("mousedown", handleClickOutside);
  }, [courseSelectorRef]);

  const handleDismissAnnouncement = () => {
    if (announcement) {
        (window as any).localStorage.setItem('dismissedAnnouncementId', announcement.id);
        setShowAnnouncement(false);
    }
  };

  const handleAttachmentClick = (data: { course: Course, subjectId: string, chapterId: string, lecture: Lecture }) => {
    setAttachmentModalData(data);
  };


  return (
    <>
        {attachmentModalData && (
             <AttachmentModal 
                lecture={attachmentModalData.lecture} 
                onClose={() => setAttachmentModalData(null)}
                courseId={attachmentModalData.course.id}
                subjectId={attachmentModalData.subjectId}
                chapterId={attachmentModalData.chapterId}
            />
        )}
        {showAnnouncement && announcement && (
            <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-5 animate-fade-in-up">
                <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                        <Megaphone className="text-primary mt-1" size={24} />
                        <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" title="New Announcement"></span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{announcement.title}</h3>
                        <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{announcement.content}</p>
                    </div>
                    <button onClick={handleDismissAnnouncement} className="p-1 -mt-2 -mr-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>
        )}
        <div className="opacity-0 animate-fade-in-up">
            {loading ? <CourseCardSkeleton count={1} isHero /> : (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl p-4 sm:p-6 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative" ref={courseSelectorRef}>
                            <button onClick={() => setIsCourseSelectorOpen(prev => !prev)} className="flex items-center gap-2" disabled={enrolledCourses.length <= 1}>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{selectedCourse?.title || "Your Dashboard"}</h2>
                                {enrolledCourses.length > 1 && <ChevronDown size={20} className={`text-slate-500 transition-transform ${isCourseSelectorOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            {isCourseSelectorOpen && enrolledCourses.length > 1 && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl animate-fade-in-up py-1 z-10">
                                {enrolledCourses.map(course => (
                                    <button 
                                    key={course.id}
                                    onClick={() => {
                                        setSelectedCourse(course);
                                        (window as any).localStorage.setItem('vedpath-selected-course-id', course.id);
                                        setIsCourseSelectorOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-slate-100 ${selectedCourse?.id === course.id ? 'text-primary bg-slate-50' : 'text-slate-700'}`}
                                    >
                                    {course.title}
                                    </button>
                                ))}
                                </div>
                            )}
                        </div>
                        <Link to="#" className="hidden sm:inline-block bg-primary/10 text-primary font-semibold px-4 py-2 text-sm rounded-lg hover:bg-primary/20 transition-colors">
                            Weekly Schedule
                        </Link>
                    </div>
                    
                    {todaysClasses.length > 0 ? (
                        <>
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <Radio size={20} className="text-red-500 animate-pulse" /> Live & Recent Classes
                            </h3>
                             <div className='flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:p-0 md:m-0 no-scrollbar snap-x'>
                                {todaysClasses.map(({course, subjectId, chapterId, lecture}) => (
                                    <div key={lecture.id} className="w-80 flex-shrink-0 md:w-auto snap-center">
                                        <TodaysClassCard 
                                            course={course} 
                                            subjectId={subjectId} 
                                            chapterId={chapterId} 
                                            lecture={lecture} 
                                            onAttachmentClick={() => handleAttachmentClick({course, subjectId, chapterId, lecture})}
                                            liveDelayPassed={liveDelayPassed}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 text-center">
                                <Link to={`/course/${selectedCourse?.id}`} className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-dark transition-transform hover:scale-105 inline-block shadow-lg shadow-primary/30">
                                    View All Classes
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-slate-500">{selectedCourse ? "No classes scheduled for this batch today." : "No enrolled courses found."}</p>
                             {selectedCourse && (
                                <Link to={`/course/${selectedCourse.id}`} className="mt-4 inline-block bg-primary text-white font-semibold px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                                    Go to Course
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center mt-12 mb-6 gap-4">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">My Enrolled Courses</h3>
            </div>
            
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <CourseCardSkeleton count={3} />
                </div>
            ) : enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {enrolledCourses.map((course, index) => (
                  <EnrolledCourseCard key={course.id} course={course} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-xl shadow-sm">
                <p className="text-slate-500 text-lg">You haven't enrolled in any courses yet.</p>
                <Link to="/batches" className="mt-6 inline-block bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30">
                  Explore Courses
                </Link>
              </div>
            )}
        </div>
    </>
  );
};

const TodaysClassCard: React.FC<{ 
    course: Course, 
    subjectId: string, 
    chapterId: string, 
    lecture: Lecture, 
    onAttachmentClick: () => void,
    liveDelayPassed: boolean 
}> = ({ course, subjectId, chapterId, lecture, onAttachmentClick, liveDelayPassed }) => {
    const linkTo = `/course/${course.id}/subject/${subjectId}/chapter/${chapterId}/video/${lecture.id}`;
    const hasAttachments = lecture.materials && Object.keys(lecture.materials).length > 0;

    const handleAttachmentClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onAttachmentClick();
    };
    
    const isYouTube = lecture.videoType === 'youtube' || (!lecture.videoType && lecture.youtubeId);
    const thumbnailSrc = lecture.thumbnail || (isYouTube && lecture.youtubeId ? `https://i.ytimg.com/vi/${lecture.youtubeId}/mqdefault.jpg` : undefined);

    // 15s Delay Placeholder for Live Classes
    if (lecture.isLive && !liveDelayPassed) {
        return (
            <div className="bg-white p-6 border border-slate-200/80 rounded-2xl shadow-lg h-full min-h-[280px] flex flex-col items-center justify-center text-center animate-pulse ring-4 ring-red-50">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Clock className="text-red-500 animate-spin-slow" size={36} />
                </div>
                <h4 className="font-bold text-slate-800 mb-2 text-lg">Class Starting Soon...</h4>
                <p className="text-sm text-slate-500 font-medium max-w-[200px]">Please wait while we connect you to the live stream.</p>
                <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <Loader2 size={14} className="animate-spin text-red-500" /> CONNECTING
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white p-4 border rounded-2xl shadow-lg hover:shadow-xl transition-all flex flex-col group h-full hover:-translate-y-1 ${lecture.isLive ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-200/80'}`}>
            <Link to={linkTo} className="block w-full aspect-video rounded-lg flex-shrink-0 overflow-hidden relative mb-3 bg-slate-100">
                <TelegramImage
                    src={thumbnailSrc}
                    alt={lecture.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    skeleton={<div className="w-full h-full bg-slate-200 animate-pulse" />}
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <PlayCircle size={48} className="text-white/90 drop-shadow-lg" />
                </div>
                {lecture.isLive && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 animate-pulse shadow-md">
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                    </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {lecture.duration}
                </div>
            </Link>
            <div className="flex-grow flex flex-col">
                <h4 className={`font-bold leading-snug mb-1 transition-colors flex-grow line-clamp-2 ${lecture.isLive ? 'text-red-700' : 'text-slate-800 group-hover:text-primary'}`}>
                    {lecture.title}
                </h4>
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                    By <span className="font-semibold text-slate-700">{course.instructor}</span>
                </p>
            </div>
            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-semibold">
                <Link to={linkTo} className={`${lecture.isLive ? 'text-red-600 hover:text-red-700' : 'text-primary hover:text-primary-dark'} transition-colors flex items-center gap-1`}>
                    {lecture.isLive ? 'Join Live' : 'View Lecture'}
                </Link>
                {hasAttachments && (
                     <button onClick={handleAttachmentClick} className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-200 hover:border-primary/30">
                        <FileText size={14} />
                        <span>PDFs</span>
                    </button>
                )}
            </div>
        </div>
    );
}

const EnrolledCourseCard: React.FC<{ course: Course, index: number }> = ({ course, index }) => {
  const progress = Math.floor(Math.random() * 100);

  return (
    <Link 
      to={`/course/${course.id}`} 
      className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      <div className="relative">
        <TelegramImage src={course.thumbnail} alt={course.title} className="w-full h-44 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h4 className="font-bold text-lg text-slate-800 mb-2 truncate group-hover:text-primary transition-colors">{course.title}</h4>
        <p className="text-slate-500 text-sm mb-4">By {course.instructor}</p>
        <div className="mt-auto">
            <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 shadow-inner">
                <div className="bg-gradient-to-r from-blue-400 to-primary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </div>
    </Link>
  );
};

export default StudyPage;
