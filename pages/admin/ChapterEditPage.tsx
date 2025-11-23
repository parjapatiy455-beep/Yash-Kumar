


import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDom;
import { Chapter, Lecture, Material, Quiz, Question } from '../../types';
import { ArrowLeft, PlusCircle, Trash, Save, ChevronDown, GripVertical, UploadCloud, FileVideo, AlertCircle, Scissors, Image, Clock, Zap, BrainCircuit, Radio, Square, Play } from 'lucide-react';
import { db } from '../../firebase';
import { ref, set, get, push } from 'firebase/database';
import { uploadToTelegram } from '../../utils/telegram';
import { splitVideo } from '../../utils/videoProcessor';
import LoadingIndicator from '../../components/LoadingIndicator';
import NoData from '../../components/NoData';
import TelegramImage from '../../components/TelegramImage';
import { formatTime } from '../../utils/formatTime';
import { logoSrc } from '../../assets/logo';

const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const ChapterEditPage: React.FC = () => {
    const { courseId, subjectId, chapterId } = useParams<{ courseId: string; subjectId: string; chapterId: string }>();
    const navigate = useNavigate();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState({ course: '', subject: ''});
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');

    const fetchChapter = useCallback(async () => {
        if (!courseId || !subjectId || !chapterId) return;
        setLoading(true);
        try {
            const courseRefDb = ref(db, `courses/${courseId}`);
            const subjectRefDb = ref(db, `courses/${courseId}/subjects/${subjectId}`);
            const chapterRefDb = ref(db, `courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}`);
            const [courseSnap, subjectSnap, chapterSnap] = await Promise.all([get(courseRefDb), get(subjectRefDb), get(chapterRefDb)]);

            if (courseSnap.exists()) setBreadcrumbs(prev => ({ ...prev, course: courseSnap.val().title }));
            if (subjectSnap.exists()) setBreadcrumbs(prev => ({ ...prev, subject: subjectSnap.val().title }));
            if (chapterSnap.exists()) {
                setChapter({ ...chapterSnap.val(), lectures: chapterSnap.val().lectures || {}, materials: chapterSnap.val().materials || {} });
            }
        } catch (error) {
            console.error("Failed to fetch chapter data", error);
        } finally {
            setLoading(false);
        }
    }, [courseId, subjectId, chapterId]);

    useEffect(() => {
        fetchChapter();
    }, [fetchChapter]);

    const handleSave = useCallback(async (updatedChapter?: Chapter, message?: string) => {
        const chapterToSave = updatedChapter || chapter;
        if (!courseId || !subjectId || !chapterId || !chapterToSave) return;
        setSaveStatus('Saving...');
        try {
            await set(ref(db, `courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}`), chapterToSave);
            setSaveStatus(message || 'Content saved successfully!');
        } catch (err) {
            setSaveStatus(`Error: ${(err as Error).message}`);
            console.error(err);
        } finally {
            setTimeout(() => setSaveStatus(''), 3000);
        }
    }, [courseId, subjectId, chapterId, chapter]);
    
    const handleUpdate = (updatedChapter: Chapter, message: string) => {
        setChapter(updatedChapter);
        handleSave(updatedChapter, message);
    };

    if (loading || !chapter) return <LoadingIndicator fullscreen />;

    return (
        <div className="min-h-screen bg-light font-sans">
            <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 p-4 border-b border-slate-200/80 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/admin/courses/${courseId}/subjects/${subjectId}`)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary font-semibold transition-colors">
                        <ArrowLeft size={16} />
                        <span className="font-bold truncate max-w-xs text-slate-800">{breadcrumbs.subject}</span>
                    </button>
                    <div className="h-6 border-l border-slate-300"></div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800">{chapter.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    {saveStatus && <p className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg">{saveStatus}</p>}
                    <button onClick={() => handleSave()} className="btn-primary"><Save size={18}/> Save Changes</button>
                </div>
            </header>
            
            <main className="p-4 sm:p-6 md:p-8">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        {/* LIVE CLASS SECTION */}
                        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
                            <LiveClassManager chapter={chapter} onUpdate={handleUpdate} />
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
                            <LectureListManager chapter={chapter} onUpdate={handleUpdate} />
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
                            <QuizManager chapter={chapter} onUpdate={handleUpdate} />
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md h-fit">
                             <ContentList type="Material" items={chapter.materials || {}} onUpdate={(items) => handleUpdate({...chapter, materials: items}, 'Materials Updated!')} title="Chapter Materials" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// LIVE CLASS MANAGER COMPONENT
const LiveClassManager: React.FC<{chapter: Chapter, onUpdate: (c: Chapter, msg: string) => void}> = ({ chapter, onUpdate }) => {
    const { courseId, subjectId, chapterId } = useParams();
    const [title, setTitle] = useState('');
    const [isLive, setIsLive] = useState(false);
    const [status, setStatus] = useState('');
    const [streamId, setStreamId] = useState<string | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunkIntervalRef = useRef<number | null>(null);
    const accumulatedIds = useRef<string[]>([]);

    const stopLive = async () => {
        if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        
        setIsLive(false);
        setStatus('Finalizing Recording...');
        
        // Update Firebase to mark as recorded
        if (streamId && accumulatedIds.current.length > 0) {
             const totalSeconds = accumulatedIds.current.length * 5.5;
             // Change protocol to telegram-playlist for VOD (removing "Live" status)
             const finalUrl = `telegram-playlist:5.5|${accumulatedIds.current.join(',')}`;
             
             const lectureRef = ref(db, `courses/${courseId}/subjects/${subjectId}/chapters/${chapter.id}/lectures/${streamId}`);
             const currentLecture = chapter.lectures![streamId];
             
             // Rename: Remove "🔴 LIVE: " prefix and add timestamp info
             const cleanTitle = currentLecture.title
                .replace(/^🔴 LIVE:\s*/i, '')
                .replace(/^🔴 LIVE\s*/i, '')
                .trim();
                
             const now = new Date();
             const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
             const dateStr = now.toLocaleDateString();
             const finalTitle = `Recorded: ${cleanTitle} (Live at ${timeStr}, ${dateStr})`;
             
             const updatedLecture = { 
                 ...currentLecture, 
                 title: finalTitle,
                 isLive: false, 
                 videoType: 'telegram', // Switch to standard video type
                 videoUrl: finalUrl,
                 duration: formatTime(totalSeconds, true)
             };

             await set(lectureRef, updatedLecture);
             
             // Update local state to reflect change
             const updatedLectures = { ...chapter.lectures, [streamId]: updatedLecture };
             onUpdate({...chapter, lectures: updatedLectures}, 'Live Class Ended & Saved as Video.');
        } else if (streamId) {
             // If no segments uploaded, delete the empty entry
             await set(ref(db, `courses/${courseId}/subjects/${subjectId}/chapters/${chapter.id}/lectures/${streamId}`), null);
             const { [streamId]: _, ...rest } = chapter.lectures || {};
             onUpdate({...chapter, lectures: rest}, 'Live Class Cancelled (No Data).');
        }
        
        setStreamId(null);
        accumulatedIds.current = [];
        setTitle('');
    };

    const startLive = async () => {
        if (!title) return alert("Enter a title for the live class");
        setStatus('Initializing Camera...');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: true });
            streamRef.current = stream;
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
                // Ensure autoPlay is set in code too, muted for admin
                videoPreviewRef.current.muted = true;
                await videoPreviewRef.current.play();
            }

            setStatus('Creating Lecture Entry...');
            // Create lecture entry
            const newId = push(ref(db, 'temp')).key!;
            const lectures = chapter.lectures || {};
            const newLecture: Lecture = {
                id: newId,
                title: `🔴 LIVE: ${title}`,
                duration: 'LIVE',
                order: Object.keys(lectures).length + 1,
                videoType: 'live',
                isLive: true,
                videoUrl: '', // Empty initially, updated after first chunk
                thumbnail: logoSrc // Default thumbnail for live
            };
            
            // Update chapter immediately
            const updatedLectures = { ...lectures, [newId]: newLecture };
            onUpdate({ ...chapter, lectures: updatedLectures }, 'Live Class Created!');
            setStreamId(newId);
            setIsLive(true);
            accumulatedIds.current = [];

            // Start Recording Loop
            setStatus('LIVE - Recording & Uploading...');
            // Ensure audio capability
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
            
            const recordSegment = () => {
                if (!streamRef.current || !streamRef.current.active) return;
                
                // Start new recorder for each segment to ensure independent blobs
                const recorder = new MediaRecorder(streamRef.current, { mimeType });
                const chunks: Blob[] = [];
                
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                
                recorder.onstop = async () => {
                    if (chunks.length === 0) return;
                    const blob = new Blob(chunks, { type: mimeType });
                    const file = new File([blob], `live_segment_${Date.now()}.webm`, { type: mimeType });
                    
                    try {
                        // Upload in background
                        const fileId = await uploadToTelegram(file);
                        if (fileId) {
                            accumulatedIds.current.push(fileId);
                            // Update Firebase URL to include new segment
                            const liveUrl = `telegram-live:5.5|${accumulatedIds.current.join(',')}`;
                            const lectureRef = ref(db, `courses/${courseId}/subjects/${subjectId}/chapters/${chapter.id}/lectures/${newId}`);
                            // Direct DB update to avoid full component re-render interruptions
                            set(lectureRef, { ...newLecture, videoUrl: liveUrl }); 
                        }
                    } catch (e) { console.error("Segment upload failed", e); }
                };

                recorder.start();
                recorderRef.current = recorder;
                setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 5500); // 5.5s chunks
            };

            recordSegment(); // First chunk
            chunkIntervalRef.current = window.setInterval(recordSegment, 5500);

        } catch (err) {
            console.error(err);
            setStatus(`Error: ${(err as Error).message}`);
            setIsLive(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { if (isLive) stopLive(); };
    }, []);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 border-b pb-3 flex items-center gap-2">
                <Radio className="text-red-600" /> Live Class Studio
            </h2>

            {!isLive ? (
                <div className="space-y-3">
                    <input 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="Live Class Topic" 
                        className="input-style"
                    />
                    <button onClick={startLive} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                        <Radio size={20} /> GO LIVE NOW
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                        {/* Muted is essential for admin preview to avoid feedback loops */}
                        <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full"></div> LIVE ON AIR
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-mono text-red-600 animate-pulse">{status}</p>
                        <button onClick={stopLive} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-900">
                            <Square size={16} className="inline mr-2" fill="white"/> END STREAM & SAVE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const LectureListManager: React.FC<{chapter: Chapter, onUpdate: (c: Chapter, msg: string) => void}> = ({ chapter, onUpdate }) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const [videoType, setVideoType] = useState<'youtube' | 'telegram'>('youtube');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [splitDuration, setSplitDuration] = useState<number>(10);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadingThumbId, setUploadingThumbId] = useState<string | null>(null);
    
    const [openLectureId, setOpenLectureId] = useState<string | null>(null);
    const lectures = chapter.lectures || {};

    const handleAddLecture = async () => {
        if (!newItemTitle) { (window as any).alert("Please enter a lecture title"); return; }
        setUploadError(null);
        
        let youtubeId = null;
        let videoUrl = null;
        let thumbnailUrl = logoSrc; // DEFAULT THUMBNAIL
        const type: 'youtube' | 'telegram' = videoType;

        if (videoType === 'youtube') {
            const id = getYouTubeId(youtubeUrl);
            if (!id) { (window as any).alert("Invalid YouTube URL"); return; }
            youtubeId = id;
        } else {
            if (!videoFile) { (window as any).alert("Please select a video file to upload"); return; }
            setUploading(true);
            setUploadProgress(0);
            setUploadStatus('Initializing...');

            try {
                // 1. Upload Thumbnail if exists, else use default
                if (thumbnailFile) {
                    setUploadStatus('Uploading Thumbnail...');
                    const thumbId = await uploadToTelegram(thumbnailFile);
                    if (thumbId) thumbnailUrl = `telegram:${thumbId}`;
                }

                // 2. Process Video
                const DIRECT_UPLOAD_LIMIT = 2 * 1024 * 1024; // 2MB Limit for direct
                const isLargeFile = videoFile.size > DIRECT_UPLOAD_LIMIT;

                const fileIds: string[] = [];
                
                if (isLargeFile) {
                     setUploadStatus(`Processing ${Math.round(videoFile.size/1024/1024)}MB file...`);
                     
                     try {
                        // Split video using FFmpeg in browser
                        const segments = await splitVideo(videoFile, splitDuration, (prog, stage) => {
                             if (stage !== 'Done') {
                                setUploadProgress(Math.round(prog * 0.5));
                                setUploadStatus(stage);
                             }
                        });

                        setUploadStatus(`Uploading ${segments.length} optimized clips...`);
                        
                        for (let i = 0; i < segments.length; i++) {
                            const segment = segments[i];
                            setUploadStatus(`Uploading part ${i + 1} of ${segments.length}...`);
                            
                            // Small delay to prevent Telegram API flood
                            if (i > 0) await new Promise(r => setTimeout(r, 1000));

                            const fileId = await uploadToTelegram(segment);
                            if (!fileId) throw new Error(`Failed to upload clip ${i + 1}`);
                            
                            fileIds.push(fileId);
                            
                            const totalUploadProgress = 50 + Math.round(((i + 1) / segments.length) * 50);
                            setUploadProgress(totalUploadProgress);
                        }
                        videoUrl = `telegram-playlist:${splitDuration}|${fileIds.join(',')}`;

                     } catch (err) {
                         console.error("Splitting error", err);
                         throw new Error("Video processing failed: " + (err as Error).message);
                     }

                } else {
                    setUploadStatus('Uploading...');
                    const fileId = await uploadToTelegram(videoFile, (prog) => setUploadProgress(prog));
                    if (!fileId) throw new Error("Upload failed");
                    videoUrl = fileId.startsWith('telegram') ? fileId : `telegram:${fileId}`;
                }

            } catch (e) {
                const msg = (e as Error).message;
                console.error("Upload error:", e);
                setUploadError(msg);
                setUploading(false);
                setUploadProgress(0);
                return;
            }
            setUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
        
        const newId = push(ref(db, 'temp')).key!;
        
        const newLecture: Lecture = { 
            id: newId, 
            title: newItemTitle, 
            duration: 'N/A', 
            order: Object.keys(lectures).length + 1,
            videoType: type,
            youtubeId: youtubeId,
            videoUrl: videoUrl,
            thumbnail: thumbnailUrl
        };

        onUpdate({...chapter, lectures: {...lectures, [newId]: newLecture}}, 'Lecture Added!');
        setNewItemTitle('');
        setYoutubeUrl('');
        setVideoFile(null);
        setThumbnailFile(null);
    };
    
    const handleThumbnailUpload = async (lectureId: string, file: File) => {
        setUploadingThumbId(lectureId);
        try {
            const fileId = await uploadToTelegram(file);
            if (fileId) {
                const thumbnailUrl = `telegram:${fileId}`;
                const updatedLecture = { ...lectures[lectureId], thumbnail: thumbnailUrl };
                onUpdate({...chapter, lectures: {...lectures, [lectureId]: updatedLecture}}, 'Thumbnail Updated!');
            }
        } catch(e) {
            alert("Thumbnail upload failed");
        } finally {
            setUploadingThumbId(null);
        }
    }

    const handleDeleteLecture = (lectureId: string) => {
        const {[lectureId]: _, ...rest} = lectures;
        onUpdate({...chapter, lectures: rest}, 'Lecture Deleted!');
    };
    
    const handleUpdateLectureMaterials = (lectureId: string, materials: Record<string, Material>) => {
        const updatedLecture = {...lectures[lectureId], materials};
        onUpdate({...chapter, lectures: {...lectures, [lectureId]: updatedLecture}}, 'Lecture Attachments Updated!');
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 border-b pb-3">Manage Lectures ({Object.keys(lectures).length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {Object.keys(lectures).length > 0 ? (Object.values(lectures) as Lecture[]).sort((a, b) => a.order - b.order).map((lecture) => (
                    <div key={lecture.id} className={`bg-slate-50 p-2 rounded-lg border ${lecture.isLive ? 'border-red-300 bg-red-50' : ''}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1 gap-3 overflow-hidden">
                                <GripVertical className="cursor-move text-slate-400 flex-shrink-0"/>
                                {lecture.thumbnail ? (
                                     <TelegramImage src={lecture.thumbnail} className="w-12 h-8 object-cover rounded border bg-white" />
                                ) : (
                                     <div className="w-12 h-8 bg-slate-200 rounded border flex items-center justify-center text-[10px] text-slate-500">No Img</div>
                                )}
                                <span className="truncate pr-2 font-medium flex-1 flex items-center gap-2">
                                    {lecture.title}
                                    <span className={`text-xs px-1.5 py-0.5 rounded uppercase ${lecture.isLive ? 'bg-red-600 text-white animate-pulse' : lecture.videoType === 'telegram' ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                                        {lecture.isLive ? 'LIVE' : lecture.videoType || 'youtube'}
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-center flex-shrink-0">
                                <button onClick={() => setOpenLectureId(openLectureId === lecture.id ? null : lecture.id)} className="p-1 text-slate-500 hover:text-primary" title="Manage Details"><ChevronDown size={16} /></button>
                                <button onClick={() => handleDeleteLecture(lecture.id)} className="delete-btn p-1"><Trash size={14}/></button>
                            </div>
                        </div>
                        {openLectureId === lecture.id && (
                            <div className="p-3 mt-2 border-t bg-white space-y-4">
                                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="w-24 h-14 bg-slate-200 rounded-md overflow-hidden flex-shrink-0 relative">
                                        {lecture.thumbnail ? (
                                            <TelegramImage src={lecture.thumbnail} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Image</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-700 mb-1">Change Thumbnail</p>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if(file) handleThumbnailUpload(lecture.id, file);
                                            }}
                                            disabled={uploadingThumbId === lecture.id}
                                            className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                        />
                                         {uploadingThumbId === lecture.id && <p className="text-xs text-blue-600 mt-1 animate-pulse">Uploading...</p>}
                                    </div>
                                </div>
                                <ContentList type="Material" items={lecture.materials || {}} onUpdate={(items) => handleUpdateLectureMaterials(lecture.id, items)} title="Lecture Attachments"/>
                            </div>
                        )}
                    </div>
                )) : <NoData message="No lectures yet" className="py-4" />}
            </div>
            
            <div className="border-t pt-4 space-y-3">
                <h3 className="text-lg font-semibold text-slate-700">Add New Lecture</h3>
                
                <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                        <input type="radio" name="videoType" checked={videoType === 'youtube'} onChange={() => setVideoType('youtube')} className="accent-red-600"/>
                        <span className="text-sm font-bold text-red-700">YouTube</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                        <input type="radio" name="videoType" checked={videoType === 'telegram'} onChange={() => setVideoType('telegram')} className="accent-blue-600"/>
                        <span className="text-sm font-bold text-blue-700">Video Upload</span>
                    </label>
                </div>

                <input value={newItemTitle} onChange={e => setNewItemTitle((e.target as any).value)} placeholder="Lecture Title" className="input-style"/>
                
                {videoType === 'youtube' ? (
                    <div className="space-y-2">
                         <input value={youtubeUrl} onChange={e => setYoutubeUrl((e.target as any).value)} placeholder="YouTube URL" className="input-style"/>
                         <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2">
                            <div className="p-2 bg-slate-100 rounded-md text-slate-500">
                                <Image size={20} />
                            </div>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={e => setThumbnailFile((e.target as any).files?.[0] || null)} 
                                className="text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 w-full"
                            />
                            <span className="text-xs text-slate-400 whitespace-nowrap pr-2">Optional Custom Thumb</span>
                        </div>
                    </div>
                ) : (
                     <div className="space-y-2">
                        <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors relative ${uploadError ? 'border-rose-300 bg-rose-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                            <input type="file" accept="video/*" onChange={e => {setVideoFile((e.target as any).files?.[0] || null); setUploadError(null);}} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="flex flex-col items-center gap-1 pointer-events-none">
                                {uploadError ? <AlertCircle size={24} className="text-rose-500"/> : <FileVideo size={24} className="text-primary"/>}
                                <span className={`text-sm ${uploadError ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>
                                    {uploadError ? uploadError : (videoFile ? videoFile.name : "Click to Select Video File")}
                                </span>
                                {!uploadError && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Zap size={10}/> Turbo-Splitting Enabled (100MB+ ready)</span>}
                            </div>
                        </div>
                        
                         <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><Clock size={12}/> Segment Duration</label>
                                <select 
                                    value={splitDuration} 
                                    onChange={(e) => setSplitDuration(Number((e.target as any).value))}
                                    className="input-style py-2"
                                >
                                    <option value="5">5s (For &lt; 50MB)</option>
                                    <option value="10">10s (For 100MB+)</option>
                                    <option value="15">15s (For 300MB+)</option>
                                    <option value="30">30s (Very Large Files)</option>
                                </select>
                            </div>
                             <div className="flex-[2] border border-slate-300 rounded-lg p-2 flex items-center gap-3 bg-white">
                                <div className="p-2 bg-slate-100 rounded-md text-slate-500">
                                    <Image size={20} />
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={e => setThumbnailFile((e.target as any).files?.[0] || null)} 
                                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 w-full"
                                />
                            </div>
                         </div>
                    </div>
                )}
                
                {uploading && (
                    <div className="w-full mb-2">
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>{uploadStatus}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="bg-slate-200 rounded-full h-3 dark:bg-slate-700 overflow-hidden">
                            <div className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-center text-[8px] text-white font-bold" style={{ width: `${uploadProgress}%` }}>
                            </div>
                        </div>
                    </div>
                )}
                
                <button onClick={handleAddLecture} disabled={uploading} className="btn-secondary w-full flex justify-center gap-2">
                     {uploading ? <><span className="animate-spin">⏳</span> Processing...</> : <><PlusCircle size={18} /> Add Lecture</>}
                </button>
            </div>
        </div>
    );
};

const QuizManager: React.FC<{chapter: Chapter, onUpdate: (c: Chapter, msg: string) => void}> = ({ chapter, onUpdate }) => {
    const [qText, setQText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);
    const [marks, setMarks] = useState(4);

    const quiz = chapter.quiz || { id: 'default', title: `${chapter.title} Quiz`, questions: {} };
    const questions = Object.values(quiz.questions || {}) as Question[];

    const handleAddQuestion = () => {
        if (!qText || options.some(o => !o)) {
            (window as any).alert("Fill all fields"); return;
        }
        const newQId = push(ref(db, 'temp')).key!;
        const newQ: Question = { id: newQId, text: qText, options, correctOptionIndex: correctIdx, marks };
        const updatedQuiz = { ...quiz, questions: { ...quiz.questions, [newQId]: newQ } };
        onUpdate({ ...chapter, quiz: updatedQuiz }, 'Quiz Updated!');
        setQText(''); setOptions(['', '', '', '']);
    };

    const handleDeleteQuestion = (qId: string) => {
        const { [qId]: _, ...rest } = quiz.questions;
        onUpdate({ ...chapter, quiz: { ...quiz, questions: rest } }, 'Question Deleted');
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 border-b pb-3 flex items-center gap-2">
                <BrainCircuit className="text-purple-600"/> Quiz Management
            </h2>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
                {questions.map((q, i) => (
                    <div key={q.id} className="bg-purple-50 p-3 rounded-lg border border-purple-100 relative">
                        <p className="font-semibold text-sm pr-6">Q{i+1}: {q.text}</p>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"><Trash size={14}/></button>
                    </div>
                ))}
            </div>

            <div className="border-t pt-4 space-y-3 bg-slate-50 p-3 rounded-lg">
                <h4 className="font-semibold text-sm">Add Question</h4>
                <textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="Question Text" className="input-style" rows={2}/>
                <div className="grid grid-cols-2 gap-2">
                    {options.map((opt, i) => (
                        <input key={i} value={opt} onChange={e => {
                            const newOpts = [...options]; newOpts[i] = e.target.value; setOptions(newOpts);
                        }} placeholder={`Option ${i+1}`} className={`input-style ${correctIdx === i ? 'border-green-500 ring-1 ring-green-500' : ''}`}/>
                    ))}
                </div>
                <div className="flex gap-4 items-center">
                    <label className="text-xs font-bold text-slate-600">Correct Option (0-3):</label>
                    <input type="number" min={0} max={3} value={correctIdx} onChange={e => setCorrectIdx(Number(e.target.value))} className="input-style w-16" />
                    <button onClick={handleAddQuestion} className="btn-primary flex-1 py-1.5 text-sm">Add Question</button>
                </div>
            </div>
        </div>
    );
};

const ContentList: React.FC<{ type: 'Material', items: Record<string, Material>, onUpdate: (items: Record<string, Material>) => void, title: string }> = ({type, items, onUpdate, title}) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemFile, setNewItemFile] = useState<File | null>(null);
    const [newItemCategory, setNewItemCategory] = useState<'Class Notes' | 'DPP' | 'DPP PDF'>('Class Notes');
    const [isUploading, setIsUploading] = useState(false);

    const handleAddItem = async () => {
        if (!newItemFile || !newItemTitle) { (window as any).alert("Missing File or Title"); return; }
        setIsUploading(true);
        try {
            const fileId = await uploadToTelegram(newItemFile);
            if (!fileId) throw new Error("Telegram upload failed");
            
            const fileUrl = fileId.startsWith('telegram') ? fileId : `telegram:${fileId}`;
            const newId = push(ref(db, 'temp')).key!;
            const newMaterial: Material = { id: newId, filename: newItemTitle, url: fileUrl, storagePath: '', category: newItemCategory };
            onUpdate({...items, [newId]: newMaterial});
            setNewItemTitle(''); setNewItemFile(null);
        } catch (err) {
            (window as any).alert(`Upload failed: ${(err as Error).message}`);
        } finally { setIsUploading(false); }
    };
    
    const handleDeleteItem = (id: string) => {
        const {[id]: _, ...rest} = items;
        onUpdate(rest);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 border-b pb-3">{title} ({Object.keys(items).length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {Object.keys(items).length > 0 ? (Object.values(items) as Material[]).map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border">
                        <span className="truncate pr-2 font-medium">{item.filename}</span>
                        <button onClick={() => handleDeleteItem(item.id)} className="delete-btn p-1 flex-shrink-0"><Trash size={14}/></button>
                    </div>
                )) : <NoData message="No materials added" className="py-4" />}
            </div>
            <div className="border-t pt-4 space-y-3">
                 <h3 className="text-lg font-semibold text-slate-700">Add New Material</h3>
                <input value={newItemTitle} onChange={e => setNewItemTitle((e.target as any).value)} placeholder="PDF Name" className="input-style"/>
                <select value={newItemCategory} onChange={e => setNewItemCategory((e.target as any).value as any)} className="input-style">
                    <option>Class Notes</option><option>DPP</option><option>DPP PDF</option>
                </select>
                <input 
                    type="file" 
                    onChange={e => setNewItemFile((e.target as any).files?.[0] || null)} 
                    accept=".pdf" 
                    className="input-style"
                />
                <button onClick={handleAddItem} disabled={isUploading} className="btn-secondary w-full"><PlusCircle size={18} /> {isUploading ? 'Uploading...' : `Add ${type}`}</button>
            </div>
        </div>
    );
};

export default ChapterEditPage;