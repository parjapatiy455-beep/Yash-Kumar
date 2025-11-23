

import React from 'react';
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { Link } = ReactRouterDom;
import { Lecture, Material } from '../types';
import { X, FileText, Download, PlayCircle } from 'lucide-react';

interface AttachmentModalProps {
    lecture: Lecture;
    onClose: () => void;
    courseId: string;
    subjectId: string;
    chapterId: string;
}

const AttachmentModal: React.FC<AttachmentModalProps> = ({ lecture, onClose, courseId, subjectId, chapterId }) => {
    // FIX: Cast Object.values to Material[] to correctly type materials and avoid downstream errors.
    const materials: Material[] = lecture.materials ? Object.values(lecture.materials) as Material[] : [];

    const groupedMaterials = materials.reduce((acc, material) => {
        const category = material.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(material);
        return acc;
    }, {} as Record<string, Material[]>);

    // FIX: Changed type to string[] to resolve 'never[]' type inference issue.
    const categoryOrder: string[] = ['Class Notes', 'DPP PDF', 'DPP'];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-slate-800">Attachments</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={20} /></button>
                </div>
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                    {Object.keys(groupedMaterials).length > 0 ? (
                        categoryOrder.map(category => groupedMaterials[category] && (
                            <div key={category}>
                                <h3 className="font-bold text-slate-800 mb-2">{category}</h3>
                                <div className="space-y-2">
                                    {groupedMaterials[category].map(material => {
                                        const isQuiz = material.category === 'DPP';
                                        const linkTo = `/course/${courseId}/subject/${subjectId}/chapter/${chapterId}/pdf/${material.id}?lectureId=${lecture.id}`;
                                        
                                        if (isQuiz) {
                                            return (
                                                <div key={material.id} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{material.filename}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">9 Questions | 36 Marks</p>
                                                    </div>
                                                    <button className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                                                        <PlayCircle size={16} /> Start
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <Link key={material.id} to={linkTo} target="_blank" className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg hover:border-primary transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <FileText size={20} className="text-primary flex-shrink-0" />
                                                    <p className="font-semibold text-slate-800 group-hover:text-primary transition-colors">{material.filename}</p>
                                                </div>
                                                <Download size={20} className="text-slate-400 group-hover:text-primary transition-colors" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-12">No attachments available for this lecture.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttachmentModal;