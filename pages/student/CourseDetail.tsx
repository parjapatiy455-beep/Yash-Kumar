




import React, { useState, useEffect } from 'react';
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { Link, useParams } = ReactRouterDom;
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, get } from 'firebase/database';
import { Course, Subject } from '../../types';
import { CourseDetailSkeleton } from '../../components/Skeletons';
import { useLayout } from '../../components/StudentLayout';
import { ChevronRight, Share2, Bell, Award, Download } from 'lucide-react';
import NoData from '../../components/NoData';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import { jsPDF } from "jspdf";

const CourseDetail: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { setHeaderTitle } = useLayout();
    const { user } = useAuth();
    
    const [course, setCourse] = useState<Course | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [generatingCert, setGeneratingCert] = useState(false);
    
    useEffect(() => {
        if (!courseId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                // FIX: Use v9 database syntax.
                const courseRef = ref(db, `courses/${courseId}`);
                const courseSnap = await get(courseRef);

                if (courseSnap.exists()) {
                    const courseData = { ...courseSnap.val(), id: courseSnap.key };
                    setCourse(courseData);
                    setHeaderTitle(courseData.title);
                    if (courseData.subjects) {
                        const subs: Subject[] = Object.values(courseData.subjects);
                        setSubjects(subs.sort((a,b) => a.order - b.order));
                    }
                    // Mock Progress Calculation (In real app, query `progress/userId/courseId`)
                    setProgress(Math.floor(Math.random() * 20) + 80); // Random 80-100% for demo
                } else {
                    setHeaderTitle("Course Not Found");
                }
            } catch (error) {
                console.error("Failed to fetch course details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId, setHeaderTitle]);

    const generateCertificate = () => {
        if (!user || !course) return;
        setGeneratingCert(true);
        
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "px",
            format: [800, 600]
        });

        // Background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 800, 600, "F");
        
        // Border
        doc.setLineWidth(10);
        doc.setDrawColor(79, 70, 229); // Indigo
        doc.rect(20, 20, 760, 560);

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(40);
        doc.setTextColor(79, 70, 229);
        doc.text("CERTIFICATE OF COMPLETION", 400, 100, { align: "center" });

        // Subtitle
        doc.setFont("helvetica", "normal");
        doc.setFontSize(18);
        doc.setTextColor(100);
        doc.text("This certifies that", 400, 160, { align: "center" });

        // Name
        doc.setFont("times", "bolditalic");
        doc.setFontSize(48);
        doc.setTextColor(0);
        doc.text(user.name, 400, 220, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(18);
        doc.setTextColor(100);
        doc.text("Has successfully completed the course", 400, 280, { align: "center" });

        // Course Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(79, 70, 229);
        doc.text(course.title, 400, 330, { align: "center" });

        // Date & Signature Line
        const date = new Date().toLocaleDateString();
        doc.setFontSize(14);
        doc.setTextColor(50);
        doc.text(`Date: ${date}`, 150, 450);
        doc.text("VedPath Academy", 650, 450, { align: "right" });
        
        doc.setLineWidth(1);
        doc.line(150, 430, 300, 430);
        doc.line(500, 430, 650, 430);

        doc.save(`Certificate-${course.title}.pdf`);
        setGeneratingCert(false);
    };

    if (loading) {
        return <CourseDetailSkeleton />;
    }

    if (!course) return <NoData message="Course not found" />;

    return (
        <div className="opacity-0 animate-fade-in-up">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl text-white shadow-2xl shadow-indigo-500/30 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{course.title}</h1>
                    <p className="opacity-80 mt-1">Select a subject to start learning</p>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                        <span>Progress: {progress}%</span>
                        <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
                            <div className="h-full bg-white" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    {progress >= 100 && (
                        <button onClick={generateCertificate} disabled={generatingCert} className="flex items-center gap-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 transition-colors px-4 py-2 rounded-lg text-sm font-bold shadow-lg animate-pulse-slow">
                            {generatingCert ? <Download size={16} /> : <Award size={16} />}
                            {generatingCert ? 'Downloading...' : 'Get Certificate'}
                        </button>
                    )}
                    <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-3 py-2 rounded-lg text-sm font-semibold">
                        <Share2 size={16}/> Share Batch
                    </button>
                     <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-3 py-2 rounded-lg text-sm font-semibold">
                        <Bell size={16}/> Announcement
                    </button>
                </div>
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Subjects</h2>
            {subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjects.map(subject => (
                        <Link to={`/course/${courseId}/subject/${subject.id}`} key={subject.id} className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-primary transition-all duration-300 flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-primary text-xl flex-shrink-0">
                                {subject.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-primary transition-colors">{subject.title}</h3>
                            </div>
                            <ChevronRight size={24} className="text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200">
                    <NoData message="No subjects have been added yet" />
                </div>
            )}
        </div>
    );
};

export default CourseDetail;