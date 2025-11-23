


import React, { useState, useEffect } from 'react';
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { useParams, useNavigate, Link } = ReactRouterDom;
import { Course, Subject, User } from '../../types';
import { ArrowLeft, PlusCircle, Trash, Save, Book, Info, Users, Settings, Trash2, GripVertical, Edit2 } from 'lucide-react';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, set, get, push, update } from 'firebase/database';
import LoadingIndicator from '../../components/LoadingIndicator';
import TelegramImage from '../../components/TelegramImage';
import { uploadToTelegram } from '../../utils/telegram';
import { logoSrc } from '../../assets/logo';

const CourseEdit: React.FC = () => {
    const { courseId } = useParams<{ courseId: string; }>();
    const navigate = useNavigate();
    const isNewCourse = !courseId;

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(!isNewCourse);
    const [saveStatus, setSaveStatus] = useState('');
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        if (isNewCourse) {
            setCourse({ id: '', title: '', description: '', thumbnail: logoSrc, instructor: '', instructorImage: 'https://i.pravatar.cc/150', price: 0, tags: [], subjects: {}, publishStatus: 'draft' });
            setLoading(false);
        } else {
            const fetchData = async () => {
                setLoading(true);
                // FIX: Use v9 database syntax.
                const courseRef = ref(db, `courses/${courseId}`);
                const courseSnap = await get(courseRef);
                if (courseSnap.exists()) {
                    const courseData = courseSnap.val();
                    setCourse({ ...courseData, id: courseId, tags: courseData.tags || [], subjects: courseData.subjects || {} });
                }
                setLoading(false);
            };
            fetchData();
        }
    }, [courseId, isNewCourse]);

    const handleSave = async (updatedCourse: Course, statusMessage: string = 'Saved successfully!') => {
        if (isNewCourse) return;
        setSaveStatus('Saving...');
        try {
            const courseDataToSave = { ...updatedCourse };
            delete (courseDataToSave as any).id; // Don't save the id as a property within the object
            // FIX: Use v9 database syntax.
            await set(ref(db, `courses/${courseId}`), courseDataToSave);
            setCourse(updatedCourse);
            setSaveStatus(statusMessage);
        } catch (err) {
            setSaveStatus(`Error: ${(err as Error).message}`);
        } finally {
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    if (loading || !course) return <LoadingIndicator fullscreen />;

    const tabs = [
        { id: 'details', label: 'Details', icon: Info },
        { id: 'content', label: 'Content', icon: Book },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="opacity-0 animate-fade-in-up">
            <Link to="/admin/courses" className="flex items-center gap-2 text-primary hover:text-primary-dark mb-4 font-semibold">
                <ArrowLeft size={18} /> Back to Courses
            </Link>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-2">
                <h1 className="text-3xl font-bold text-slate-900 truncate">{isNewCourse ? 'Create New Course' : course.title}</h1>
                {saveStatus && <p className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg">{saveStatus}</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                    <nav className="flex flex-row lg:flex-col gap-1.5 bg-white border border-slate-200 p-2 rounded-xl shadow-md">
                        {tabs.map(tab => (
                            <TabButton key={tab.id} icon={tab.icon} label={tab.label} isActive={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)} disabled={isNewCourse && tab.id !== 'details'} />
                        ))}
                    </nav>
                </div>

                <div className="lg:col-span-3">
                    {activeTab === 'details' && <CourseDetailsSection initialCourse={course} isNewCourse={isNewCourse} onCourseUpdate={setCourse} setSaveStatus={setSaveStatus} />}
                    {!isNewCourse && courseId && (
                        <>
                            {activeTab === 'content' && <CourseContentSection course={course} onSave={handleSave} />}
                            {activeTab === 'students' && <CourseStudentsSection courseId={courseId} />}
                            {activeTab === 'settings' && <CourseSettingsSection course={course} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ icon: React.ElementType, label: string, isActive: boolean, onClick: () => void, disabled: boolean }> = ({ icon: Icon, label, isActive, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}
        className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm ${
            isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100 hover:text-primary'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <Icon size={20} />
        <span>{label}</span>
    </button>
);

const CourseDetailsSection: React.FC<{ initialCourse: Course, isNewCourse: boolean, onCourseUpdate: (c: Course) => void, setSaveStatus: (s: string) => void }> = ({ initialCourse, isNewCourse, onCourseUpdate, setSaveStatus }) => {
    const navigate = useNavigate();
    const [course, setCourse] = useState(initialCourse);
    const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>(initialCourse.thumbnail);

    useEffect(() => { setThumbnailPreview(initialCourse.thumbnail) }, [initialCourse.thumbnail]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target as any;
        setCourse(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!course.title) return;
        setSaveStatus('Saving...');
        let courseToSave = { ...course };
        let finalCourseId = isNewCourse ? null : course.id;

        try {
            if (isNewCourse) {
                // FIX: Use v9 database syntax.
                const newCourseRef = push(ref(db, 'courses'));
                finalCourseId = newCourseRef.key!;
                courseToSave.id = finalCourseId;
            }
            if (!finalCourseId) throw new Error("Could not determine course ID");

            if (newThumbnailFile) {
                setSaveStatus('Uploading thumbnail...');
                const fileId = await uploadToTelegram(newThumbnailFile);
                if (fileId) courseToSave.thumbnail = `telegram:${fileId}`;
                else throw new Error("Thumbnail upload failed.");
            }
            
            const courseDataToSave = {...courseToSave};
            delete (courseDataToSave as any).id;

            // FIX: Use v9 database syntax.
            await set(ref(db, `courses/${finalCourseId}`), courseDataToSave);
            setSaveStatus('Saved successfully!');
            onCourseUpdate(courseToSave);
            setThumbnailPreview(courseToSave.thumbnail);
            setNewThumbnailFile(null);

            if (isNewCourse) navigate(`/admin/courses/${finalCourseId}`, { replace: true });

        } catch (err) {
            setSaveStatus(`Error: ${(err as Error).message}`);
        } finally {
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    return (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 border-b pb-3">Course Details</h2>
            <input name="title" value={course.title} onChange={handleChange} placeholder="Course Title" className="input-style"/>
            <textarea name="description" value={course.description} onChange={handleChange} placeholder="Description" className="input-style" rows={3}/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input name="instructor" value={course.instructor} onChange={handleChange} placeholder="Instructor" className="input-style"/>
                <input name="price" type="number" value={course.price} onChange={e => setCourse(c => ({...c, price: Number(e.target.value)}))} placeholder="Price" className="input-style"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input name="tags" value={(course.tags || []).join(', ')} onChange={e => setCourse(c => ({...c, tags: e.target.value.split(',').map(t => t.trim())}))} placeholder="Tags (comma-separated)" className="input-style"/>
                <div>
                    <select name="publishStatus" value={course.publishStatus || 'draft'} onChange={handleChange} className="input-style">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                    </select>
                </div>
            </div>
            <div className="flex items-end gap-4">
                <TelegramImage src={thumbnailPreview} alt="Preview" className="w-40 h-24 object-cover rounded-md bg-slate-100 border"/>
                <input type="file" onChange={e => {
                    const file = (e.target as any).files?.[0];
                    if (file) { setNewThumbnailFile(file); setThumbnailPreview(URL.createObjectURL(file)); }
                }} accept="image/*" className="input-style"/>
            </div>
            <div className="flex justify-end pt-2 border-t">
                <button type="submit" className="btn-primary"><Save size={18}/> {isNewCourse ? 'Create & Continue' : 'Save Details'}</button>
            </div>
        </form>
    );
};

const CourseContentSection: React.FC<{course: Course, onSave: (c: Course, msg: string) => void}> = ({ course, onSave }) => {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Record<string, Subject>>(course.subjects || {});
    const [newSubjectTitle, setNewSubjectTitle] = useState('');
    const [newSubjectIcon, setNewSubjectIcon] = useState('');

    useEffect(() => {
        setSubjects(course.subjects || {});
    }, [course.subjects]);

    const handleContentUpdate = (updatedSubjects: Record<string, Subject>, msg: string) => {
        setSubjects(updatedSubjects);
        onSave({ ...course, subjects: updatedSubjects }, msg);
    };

    const handleAddSubject = () => {
        if (!newSubjectTitle) return;
        // FIX: Use v9 database syntax.
        const newId = push(ref(db, 'temp')).key!;
        const newOrder = Object.keys(subjects).length + 1;
        const newSubject: Subject = { id: newId, title: newSubjectTitle, icon: newSubjectIcon, order: newOrder, chapters: {} };
        handleContentUpdate({...subjects, [newId]: newSubject }, 'Subject added!');
        setNewSubjectTitle(''); setNewSubjectIcon('');
    };

    const handleDeleteSubject = (subjectId: string) => {
        if ((window as any).confirm("Are you sure you want to delete this subject and all its content? This action cannot be undone.")) {
            const { [subjectId]: _, ...rest } = subjects;
            handleContentUpdate(rest, 'Subject deleted!');
        }
    };

    return (
         <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 border-b pb-3 flex items-center gap-2"><Book/> Content Management</h2>
            <div className="border-b pb-4">
                <h3 className="font-semibold text-slate-700 mb-2">Add New Subject</h3>
                <div className="flex gap-2">
                    <input value={newSubjectTitle} onChange={e => setNewSubjectTitle(e.target.value)} placeholder="Subject Title (e.g., Physics)" className="input-style"/>
                    <input value={newSubjectIcon} onChange={e => setNewSubjectIcon(e.target.value)} placeholder="Icon (e.g., Ph)" className="input-style w-24"/>
                    <button onClick={handleAddSubject} className="btn-secondary"><PlusCircle size={18}/> Add</button>
                </div>
            </div>
            <div className="space-y-3">
                <h3 className="font-semibold text-slate-700">Existing Subjects</h3>
                {/* FIX: Cast Object.values to Subject[] to fix typing issues with sub properties */}
                {Object.keys(subjects).length > 0 ? (Object.values(subjects) as Subject[]).sort((a,b)=> a.order-b.order).map(sub => (
                    <div key={sub.id} className="bg-slate-50 border rounded-lg flex items-center p-3">
                        <GripVertical className="cursor-move text-slate-400"/>
                         <div className="w-10 h-10 rounded-md bg-slate-200 flex items-center justify-center font-bold text-primary text-lg flex-shrink-0 ml-2">
                            {sub.icon}
                        </div>
                        <span className="font-bold text-slate-800 ml-4 flex-1">{sub.title}</span>
                        <div className="flex items-center ml-auto gap-2">
                            <button onClick={() => navigate(`/admin/courses/${course.id}/subjects/${sub.id}`)} className="btn-secondary px-4 py-1.5 text-sm"><Edit2 size={14}/> Manage Content</button>
                            <button onClick={() => handleDeleteSubject(sub.id)} className="delete-btn"><Trash size={16} /></button>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-slate-500 py-6">No subjects added yet. Add one above to get started.</p>
                )}
            </div>
        </div>
    );
};

const CourseStudentsSection: React.FC<{ courseId: string }> = ({ courseId }) => {
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                // FIX: Use v9 database syntax.
                const enrollmentsRef = ref(db, 'enrollments');
                const enrollmentsSnapshot = await get(enrollmentsRef);
                if (!enrollmentsSnapshot.exists()) {
                    setStudents([]); setLoading(false); return;
                }
                const allEnrollments = enrollmentsSnapshot.val();
                const enrolledUserIds: string[] = [];
                for (const userId in allEnrollments) {
                    if (allEnrollments[userId][courseId]) enrolledUserIds.push(userId);
                }
                
                // FIX: Use v9 database syntax.
                const studentPromises = enrolledUserIds.map(userId => get(ref(db, `users/${userId}`)));
                const studentSnapshots = await Promise.all(studentPromises);
                const studentData = studentSnapshots.filter(snap => snap.exists()).map(snap => ({ id: snap.key!, ...snap.val() }));
                setStudents(studentData);
            } catch(e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchStudents();
    }, [courseId]);

    return (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-slate-800 border-b pb-3 mb-4">Enrolled Students ({students.length})</h2>
            {loading ? <LoadingIndicator /> : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {students.length > 0 ? students.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                            <div>
                                <p className="font-semibold text-sm text-slate-800">{student.name}</p>
                                <p className="text-xs text-slate-500">{student.email}</p>
                            </div>
                            <button className="text-xs font-semibold text-primary hover:underline">View Progress</button>
                        </div>
                    )) : <p className="text-center text-slate-500 py-10">No students are enrolled in this course yet.</p>}
                </div>
            )}
        </div>
    );
};

const CourseSettingsSection: React.FC<{ course: Course }> = ({ course }) => {
    const navigate = useNavigate();
    const handleDeleteCourse = async () => {
        if ((window as any).confirm("DANGER: Are you sure you want to permanently delete this course and all its content (subjects, chapters, videos, materials)? This action cannot be undone.")) {
            try {
                const updates: { [key: string]: null } = {};
                updates[`/courses/${course.id}`] = null;
                // FIX: Use v9 database syntax.
                const enrollmentsRef = ref(db, 'enrollments');
                const enrollmentsSnapshot = await get(enrollmentsRef);
                if (enrollmentsSnapshot.exists()) {
                    const allEnrollments = enrollmentsSnapshot.val();
                    for (const userId in allEnrollments) {
                        if (allEnrollments[userId][course.id]) {
                            updates[`/enrollments/${userId}/${course.id}`] = null;
                        }
                    }
                }
                // FIX: Use v9 database syntax.
                await update(ref(db), updates);
                (window as any).alert("Course deleted successfully.");
                navigate('/admin/courses');
            } catch (error) {
                console.error("Failed to delete course:", error);
                (window as any).alert("An error occurred while deleting the course.");
            }
        }
    };
    
    return (
        <div className="bg-white border border-rose-200 p-6 rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-semibold text-rose-800 border-b border-rose-200 pb-3">Settings & Danger Zone</h2>
            <div>
                <h3 className="font-bold text-slate-800">Delete This Course</h3>
                <p className="text-sm text-slate-600 mt-1">Once you delete a course, there is no going back. All associated content, including subjects, chapters, lectures, and student enrollments, will be permanently removed.</p>
                <button onClick={handleDeleteCourse} className="mt-4 flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    <Trash2 size={16} /> Permanently Delete Course
                </button>
            </div>
        </div>
    );
};


export default CourseEdit;