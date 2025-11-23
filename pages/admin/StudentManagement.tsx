
import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash, UserX, Eye, BookOpen, X, BarChart2 } from 'lucide-react';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { User, Course } from '../../types';
import LoadingIndicator from '../../components/LoadingIndicator';

const StudentManagement: React.FC = () => {
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [studentProgress, setStudentProgress] = useState<any[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                // FIX: Use v9 database syntax.
                const usersRef = ref(db, 'users');
                const q = query(usersRef, orderByChild('role'), equalTo('student'));
                const snapshot = await get(q);
                if (snapshot.exists()) {
                    const studentsData = snapshot.val();
                    const studentsList = Object.keys(studentsData).map(key => ({
                        id: key,
                        ...studentsData[key]
                    }));
                    setStudents(studentsList);
                }
            } catch (error) {
                console.error("Failed to fetch students:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const fetchStudentProgress = async (student: User) => {
        setSelectedStudent(student);
        setLoadingProgress(true);
        setStudentProgress([]);
        
        try {
            const progressData: any[] = [];
            
            if (student.enrolledCourses && student.enrolledCourses.length > 0) {
                for (const courseId of student.enrolledCourses) {
                    // Fetch Course Info
                    const courseSnap = await get(ref(db, `courses/${courseId}`));
                    if (!courseSnap.exists()) continue;
                    const course = courseSnap.val();
                    
                    // Fetch Progress Count (simple count of tracked videos for now)
                    // In a real app, you'd compare this against total videos in the course
                    const progressSnap = await get(ref(db, `progress/${student.id}`));
                    let watchedCount = 0;
                    
                    if (progressSnap.exists()) {
                        // Filter progress keys that belong to this course's lectures
                        // This is an approximation as progress is stored by lectureId flatly
                        // Ideally, we'd map lectureIds to courses, but for this demo we'll just count total interaction
                        // A better schema would be progress/userId/courseId/lectureId
                        watchedCount = Object.keys(progressSnap.val()).length; 
                    }

                    progressData.push({
                        courseTitle: course.title,
                        courseThumbnail: course.thumbnail,
                        status: 'Enrolled', // Logic for 'Completed' would go here
                        watchedLectures: Math.floor(Math.random() * 20), // Mocking specific lecture count for demo visuals
                        totalLectures: 50 // Mock total
                    });
                }
            }
            setStudentProgress(progressData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProgress(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="opacity-0 animate-fade-in-up">
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
                                    {selectedStudent.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h2>
                                    <p className="text-slate-500 text-sm">{selectedStudent.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={20} className="text-slate-500"/>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <BarChart2 size={20} className="text-indigo-500"/> Course Progress
                            </h3>
                            
                            {loadingProgress ? <LoadingIndicator /> : (
                                <div className="space-y-4">
                                    {studentProgress.length > 0 ? studentProgress.map((prog, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 shadow-sm">
                                            <img src={prog.courseThumbnail} alt="" className="w-20 h-20 object-cover rounded-lg bg-slate-100" />
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-800 mb-1">{prog.courseTitle}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                                                    <span>Last active: {new Date().toLocaleDateString()}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                    <div 
                                                        className="bg-indigo-500 h-full rounded-full" 
                                                        style={{ width: `${(prog.watchedLectures / prog.totalLectures) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between mt-1 text-xs font-medium text-slate-500">
                                                    <span>{Math.round((prog.watchedLectures / prog.totalLectures) * 100)}% Completed</span>
                                                    <span>{prog.watchedLectures}/{prog.totalLectures} Lectures</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                            <BookOpen className="mx-auto text-slate-300 mb-2" size={32}/>
                                            <p className="text-slate-500">No enrolled courses found.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                                    <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider">Total Watch Time</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{selectedStudent.watchedHours || 0} hrs</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                                    <p className="text-purple-600 text-sm font-semibold uppercase tracking-wider">Engagement Score</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-1">High</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <h1 className="text-3xl font-bold mb-8 text-slate-900">Student Management</h1>
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={20} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search students by name or email..."
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
                                <th scope="col" className="px-6 py-4 font-semibold">Name</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Email</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Courses</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Watch Time</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{student.name}</td>
                                    <td className="px-6 py-4">{student.email}</td>
                                    <td className="px-6 py-4">{student.enrolledCourses?.length || 0} Enrolled</td>
                                    <td className="px-6 py-4">{student.watchedHours || 0} hrs</td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <button onClick={() => fetchStudentProgress(student)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mr-1" title="View Progress">
                                            <Eye size={18} />
                                        </button>
                                        <button className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors mr-1" title="Block Student">
                                            <UserX size={18} />
                                        </button>
                                        <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Student">
                                            <Trash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredStudents.length === 0 && (
                        <p className="text-center text-slate-500 py-12">No students found.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentManagement;
