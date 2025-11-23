
import React, { useState, useEffect } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { Link } = ReactRouterDom;
import { Course } from '../types';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { ArrowRight, Book, Video, Users, Star, PlayCircle, Sparkles, CheckCircle } from 'lucide-react';
import TelegramImage from '../components/TelegramImage';

const HomePage: React.FC = () => {
    const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const coursesRef = ref(db, 'courses');
                const snapshot = await get(coursesRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const courseList = Object.keys(data).map(key => ({
                        ...data[key],
                        id: key,
                    })).filter(course => course.publishStatus === 'published');
                    setFeaturedCourses(courseList.slice(0, 3));
                }
            } catch (error) {
                console.error("Failed to fetch featured courses:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    return (
        <div className="overflow-x-hidden w-full font-sans">
            {/* ================= Hero Section ================= */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Decorative Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200 rounded-full blur-[100px] opacity-40 animate-pulse"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200 rounded-full blur-[100px] opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm mb-8 animate-fade-in-up">
                        <span className="flex h-2 w-2 relative">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        <span className="text-sm font-bold text-indigo-900 tracking-wide">New Batches Live Now</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.1] animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                        Master Your Future with <br className="hidden sm:block"/>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 relative">
                            India's Best Educators
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-indigo-300 -z-10" viewBox="0 0 200 9" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2.00024 7.09999C32.3686 3.84734 76.3389 1.62556 198.001 3.49998" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                        </span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                        Join thousands of students on VedPath. Experience HD video lectures, smart notes, and AI-powered testing designed to help you crack your exams.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                        <Link to="/signup" className="btn-primary text-lg px-8 py-3 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all">
                            Start Learning Free
                            <ArrowRight size={20} />
                        </Link>
                        <Link to="/batches" className="btn-secondary text-lg px-8 py-3">
                            <PlayCircle size={20} className="text-indigo-600" />
                            View Courses
                        </Link>
                    </div>

                    {/* Trust Metrics */}
                    <div className="mt-16 flex flex-wrap justify-center gap-4 sm:gap-12 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                            <div className="bg-green-100 p-1 rounded-full"><CheckCircle size={16} className="text-green-600"/></div>
                            <span className="font-semibold text-slate-700">50k+ Active Students</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                             <div className="bg-amber-100 p-1 rounded-full"><Star size={16} className="text-amber-600"/></div>
                            <span className="font-semibold text-slate-700">4.8/5 Average Rating</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                             <div className="bg-blue-100 p-1 rounded-full"><Video size={16} className="text-blue-600"/></div>
                            <span className="font-semibold text-slate-700">1000+ Hours Content</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= Features Grid ================= */}
            <section className="py-20 bg-white relative z-20 border-t border-slate-100">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Why Choose VedPath?</h2>
                        <p className="text-slate-600 text-lg">We've built a complete ecosystem to support your learning journey from start to finish.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={Video} 
                            title="HD Video Lectures" 
                            desc="Crystal clear concepts with our high-definition video library recorded by top experts."
                            color="bg-blue-50 text-blue-600"
                        />
                        <FeatureCard 
                            icon={Book} 
                            title="Smart Notes" 
                            desc="Concise, well-structured PDF notes to help you revise topics in minutes."
                             color="bg-indigo-50 text-indigo-600"
                        />
                        <FeatureCard 
                            icon={Sparkles} 
                            title="AI Test Series" 
                            desc="Personalized tests generated by AI to target your weak areas and improve scores."
                             color="bg-purple-50 text-purple-600"
                        />
                    </div>
                </div>
            </section>
            
            {/* ================= Trending Courses ================= */}
            <section className="py-20 bg-slate-50/50 border-t border-slate-200">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-4">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Trending Batches</h2>
                            <p className="mt-2 text-slate-600 text-lg">Join the most popular courses chosen by students.</p>
                        </div>
                        <Link to="/batches" className="hidden sm:flex items-center font-semibold text-primary hover:text-primary-hover transition-colors group">
                             View All Batches <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            <div className="col-span-full text-center py-12 text-slate-500">Loading courses...</div>
                        ) : (
                        featuredCourses.map((course, idx) => (
                            <div key={course.id} className="h-full">
                                <CourseCard course={course} />
                            </div>
                        ))
                        )}
                    </div>

                     <div className="text-center mt-12 sm:hidden">
                         <Link to="/batches" className="btn-secondary w-full">View All Batches</Link>
                     </div>
                </div>
            </section>

            {/* ================= Call to Action ================= */}
            <section className="py-20 px-4">
                <div className="container mx-auto">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 shadow-2xl text-center py-16 px-6 sm:px-16 animate-float">
                         {/* Abstract Shapes */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to launch your career?</h2>
                            <p className="text-indigo-100 text-lg sm:text-xl max-w-2xl mx-auto mb-10">Join thousands of students already learning on VedPath. Get unlimited access to the best courses.</p>
                            <Link to="/signup" className="inline-flex items-center bg-white text-indigo-600 font-bold text-lg py-3.5 px-8 rounded-xl hover:bg-indigo-50 transition-all shadow-lg transform hover:-translate-y-1">
                                Get Started Now
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard: React.FC<{icon: React.ElementType, title: string, desc: string, color: string}> = ({icon: Icon, title, desc, color}) => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
        <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
            <Icon size={28} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{desc}</p>
    </div>
);

const CourseCard: React.FC<{course: Course}> = ({ course }) => (
    <Link to={`/course/${course.id}`} className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 h-full">
        <div className="relative overflow-hidden h-48">
            <TelegramImage src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
            <div className="absolute bottom-3 left-3 right-3">
                <span className="bg-white/95 backdrop-blur-md text-slate-900 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide shadow-sm">
                    {course.targetAudience || 'Course'}
                </span>
            </div>
        </div>
        <div className="p-5 flex flex-col flex-grow">
            <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
            <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow">{course.description}</p>
            
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Price</p>
                    <p className="font-bold text-xl text-slate-900">₹{course.price.toLocaleString()}</p>
                </div>
                <span className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <ArrowRight size={18} />
                </span>
            </div>
        </div>
    </Link>
);

export default HomePage;
