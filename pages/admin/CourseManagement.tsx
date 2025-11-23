
import React, { useState, useEffect } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { Link } = ReactRouterDom;
import { Course } from '../../types';
import { Edit, Trash, PlusCircle, Search } from 'lucide-react';
import { db, storage, deleteObject, storageRef } from '../../firebase';
import { ref as databaseRef, get, update, set } from 'firebase/database';
import LoadingIndicator from '../../components/LoadingIndicator';
import TelegramImage from '../../components/TelegramImage';
import NoData from '../../components/NoData';


const CourseManagement: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const coursesRef = databaseRef(db, 'courses');
                const snapshot = await get(coursesRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const coursesList = Object.keys(data).map(key => ({
                        ...data[key],
                        id: key,
                    }));
                    setCourses(coursesList);
                } else {
                    setCourses([]);
                }
            } catch (error) {
                console.error("Failed to fetch courses:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);
    
    const clearFeedback = () => {
        setTimeout(() => setFeedback(null), 5000);
    };

    const handleStatusChange = async (courseId: string, newStatus: 'published' | 'draft') => {
        const courseRef = databaseRef(db, `courses/${courseId}/publishStatus`);
        try {
            await set(courseRef, newStatus);
            setCourses(prev => prev.map(c => c.id === courseId ? { ...c, publishStatus: newStatus } : c));
            setFeedback({ message: `Course status updated to ${newStatus}.`, type: "success" });
            clearFeedback();
        } catch (error) {
            setFeedback({ message: "Failed to update status.", type: "error" });
            clearFeedback();
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        setFeedback(null);
        if ((window as any).confirm("Are you sure you want to delete this course and all its content? This action cannot be undone.")) {
            try {
                const courseToDelete = courses.find(c => c.id === courseId);
                const materialsRef = databaseRef(db, `materials/${courseId}`);
                const materialsSnap = await get(materialsRef);
                
                const updates: { [key: string]: any } = {};
                
                updates[`/courses/${courseId}`] = null;
                updates[`/videos/${courseId}`] = null;
                updates[`/materials/${courseId}`] = null;

                const enrollmentsRef = databaseRef(db, 'enrollments');
                const enrollmentsSnapshot = await get(enrollmentsRef);
                if (enrollmentsSnapshot.exists()) {
                    const allEnrollments = enrollmentsSnapshot.val();
                    for (const userId in allEnrollments) {
                        if (allEnrollments[userId][courseId]) {
                            updates[`/enrollments/${userId}/${courseId}`] = null;
                        }
                    }
                }
                
                await update(databaseRef(db), updates);

                if (courseToDelete?.thumbnail && courseToDelete.thumbnail.includes('firebasestorage')) {
                    try {
                        const fileRef = storageRef(storage, courseToDelete.thumbnail);
                        await deleteObject(fileRef);
                    } catch (storageError: any) {
                        if (storageError.code !== 'storage/object-not-found') {
                           console.error("Could not delete thumbnail from storage:", storageError);
                        }
                    }
                }
                
                if (materialsSnap.exists()) {
                    const materialsData = materialsSnap.val();
                    for (const matId in materialsData) {
                        const material = materialsData[matId];
                        if (material.storagePath) {
                            try {
                                const materialFileRef = storageRef(storage, material.storagePath);
                                await deleteObject(materialFileRef);
                            } catch (storageError: any) {
                                if (storageError.code !== 'storage/object-not-found') {
                                    console.error(`Could not delete material ${material.storagePath}:`, storageError);
                                }
                            }
                        }
                    }
                }

                setCourses(prev => prev.filter(c => c.id !== courseId));
                setFeedback({ message: "Course and all associated data deleted successfully.", type: "success" });
                clearFeedback();
            } catch (error) {
                console.error("Failed to delete course:", error);
                setFeedback({ message: "An error occurred while deleting the course.", type: "error" });
                clearFeedback();
            }
        }
    };
    
    const filteredCourses = courses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="opacity-0 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-slate-900">Course Management</h1>
                <Link to="/admin/courses/new" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-px">
                    <PlusCircle size={20} />
                    Add New Course
                </Link>
            </div>
            
            {feedback && (
                <div className={`p-4 mb-4 rounded-lg text-sm ${
                    feedback.type === 'success' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-rose-100 text-rose-800'
                }`} role="alert">
                    <span className="font-medium">{feedback.type === 'success' ? 'Success!' : 'Error:'}</span> {feedback.message}
                </div>
            )}

            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={20} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search courses by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {loading ? <LoadingIndicator /> : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold"></th>
                                <th scope="col" className="px-6 py-4 font-semibold">Title</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Price</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCourses.map(course => (
                                <tr key={course.id} className="border-b border-slate-200 transition-colors hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                        <TelegramImage
                                            src={course.thumbnail}
                                            alt={course.title}
                                            className="w-24 h-14 object-cover rounded-md bg-slate-200"
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{course.title}</td>
                                    <td className="px-6 py-4">₹{course.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${course.publishStatus === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                            {course.publishStatus || 'draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-2">
                                            <label title={`Click to ${course.publishStatus === 'published' ? 'unpublish' : 'publish'}`} className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={course.publishStatus === 'published'} onChange={() => handleStatusChange(course.id, course.publishStatus === 'published' ? 'draft' : 'published')} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                            <Link to={`/admin/courses/${course.id}`} className="p-2 text-primary hover:text-primary-dark inline-block transition-colors" title="Edit">
                                                <Edit size={18} />
                                            </Link>
                                            <button onClick={() => handleDeleteCourse(course.id)} className="p-2 text-rose-500 hover:text-rose-700 transition-colors" title="Delete"><Trash size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredCourses.length === 0 && (
                        <NoData message="No courses found" />
                    )}
                </div>
            )}
        </div>
    );
};

export default CourseManagement;
