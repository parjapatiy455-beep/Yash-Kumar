
import React, { useState, useEffect } from 'react';
// FIX: Replaced v6 `useNavigate` with v5 `useHistory`.
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDom;
import { useAuth } from '../context/AuthContext';
import { Course } from '../types';
import { db } from '../firebase';
// FIX: Switched to v9 modular imports.
import { ref, get } from 'firebase/database';
import { CourseCardSkeleton } from './Skeletons';
import { useLayout } from './StudentLayout';
import { Search, Book, Calendar, ChevronRight, Tags, ArrowRight } from 'lucide-react';
import TelegramImage from './TelegramImage';
import { logoSrc } from '../assets/logo';

export const BatchesPage: React.FC = () => {
    const { user, enrollInCourse } = useAuth();
    const { setHeaderTitle } = useLayout();
    // FIX: Switched to useNavigate hook for v6.
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setHeaderTitle('Batches');
        const fetchAllCourses = async () => {
            setLoading(true);
            try {
                // FIX: Use v9 database syntax.
                const coursesRef = ref(db, 'courses');
                const snapshot = await get(coursesRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const courseList = Object.keys(data).map(key => ({
                        ...data[key],
                        id: key,
                    })).filter(course => course.publishStatus === 'published');
                    setCourses(courseList);
                }
            } catch (error) {
                console.error("Failed to fetch courses:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllCourses();
    }, [setHeaderTitle]);

    const handleEnroll = async (e: React.MouseEvent, course: Course) => {
        e.preventDefault(); 
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.enrolledCourses.includes(course.id)) {
            navigate(`/course/${course.id}`);
            return;
        }

        setEnrolling(course.id);

        if (course.price === 0) {
            try {
                await enrollInCourse(course.id);
                navigate(`/course/${course.id}`);
            } catch (error) {
                console.error(error);
            } finally {
                setEnrolling(null);
            }
        } else {
            // Razorpay Payment Flow
            try {
                // FIX: Use v9 database syntax.
                const settingsRef = ref(db, 'settings/razorpay');
                const snapshot = await get(settingsRef);
                if (!snapshot.exists() || !snapshot.val().keyId) {
                    (window as any).alert("Payment gateway is not configured. Please contact administrator.");
                    setEnrolling(null);
                    return;
                }
                const settings = snapshot.val();
                
                const options = {
                    key: settings.keyId,
                    amount: course.price * 100,
                    currency: "INR",
                    name: "VedPath",
                    description: `Purchase: ${course.title}`,
                    image: logoSrc,
                    handler: async (response: any) => {
                        console.log("Payment successful:", response.razorpay_payment_id);
                        await enrollInCourse(course.id);
                        navigate(`/course/${course.id}`);
                    },
                    prefill: {
                        name: user.name,
                        email: user.email,
                    },
                    theme: {
                        color: "#2563eb"
                    },
                    modal: {
                        ondismiss: () => {
                            setEnrolling(null);
                        }
                    }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
            } catch (error) {
                console.error("Payment error:", error);
                (window as any).alert("An error occurred during payment. Please try again.");
                setEnrolling(null);
            }
        }
    };
    
    const filteredCourses = courses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="opacity-0 animate-fade-in-up">
            <div className="relative mb-8">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search for batches"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm((e.target as any).value)}
                    className="w-full max-w-lg pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>
            
            {loading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <CourseCardSkeleton count={6} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => {
                        const isEnrolled = user?.enrolledCourses?.includes(course.id);
                        return (
                           <CourseCard 
                                key={course.id} 
                                course={course} 
                                isEnrolled={isEnrolled}
                                isEnrolling={enrolling === course.id}
                                onEnroll={handleEnroll}
                           />
                        );
                    })}
                </div>
            )}
        </div>
    );
};


const CourseCard: React.FC<{ course: Course, isEnrolled?: boolean, isEnrolling: boolean, onEnroll: (e: React.MouseEvent, course: Course) => void }> = ({ course, isEnrolled, isEnrolling, onEnroll }) => {
    
    const discountPercent = course.originalPrice && course.originalPrice > course.price 
        ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100) 
        : 0;

    const getButtonText = () => {
        if(isEnrolled) return "Go to Course";
        if(isEnrolling) return "Processing...";
        if(course.price === 0) return "Enroll Now";
        return "Buy Now";
    }

    return (
        <div className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 shadow-lg">
            <div className="relative">
                <Link to={`/course/${course.id}`} className="block">
                    <TelegramImage src={course.thumbnail} alt={course.title} className="w-full h-40 object-cover"/>
                    {course.planInfo && <div className="absolute top-2 left-2 text-xs bg-amber-400/90 text-black font-bold px-2 py-1 rounded-md">{course.planInfo}</div>}
                </Link>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-orange-600 font-semibold text-xs">{course.targetAudience || 'General'}</span>
                    {course.language && <span className="text-xs font-semibold border border-slate-300 px-2 py-0.5 rounded-md">{course.language}</span>}
                </div>
                <h3 className="font-bold text-base text-slate-800 mb-2 group-hover:text-primary transition-colors flex-grow">
                     <Link to={`/course/${course.id}`}>{course.title}</Link>
                </h3>
                
                <div className="text-sm text-slate-500 space-y-1.5 text-xs mb-4">
                    <p className="flex items-center gap-2"><Book size={14} /> {course.targetAudience || 'Comprehensive Course'}</p>
                    <p className="flex items-center gap-2"><Tags size={14} className="text-red-500" /> {course.status || 'Ongoing'} | Started on {course.startDate || 'N/A'}</p>
                </div>
                
                <div className="mt-auto">
                    <div className="flex items-baseline gap-2 mb-2">
                        <p className="font-extrabold text-2xl text-slate-800">₹{course.price.toLocaleString()}</p>
                        {discountPercent > 0 && <p className="text-slate-400 line-through">₹{course.originalPrice?.toLocaleString()}</p>}
                        {discountPercent > 0 && <p className="text-green-600 font-bold">{discountPercent}% OFF</p>}
                    </div>

                    {course.specialOffer && 
                        <div className="text-xs text-green-700 bg-green-100 border border-green-200 rounded-md p-1.5 text-center mb-3 font-semibold">
                            {course.specialOffer}
                        </div>
                    }

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => onEnroll(e, course)} 
                            disabled={isEnrolling}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {getButtonText()}
                        </button>
                        <Link to={`/course/${course.id}`} className="p-2.5 border-2 border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                            <ChevronRight size={20} className="text-slate-600"/>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
