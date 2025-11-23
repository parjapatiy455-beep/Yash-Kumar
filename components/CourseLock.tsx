
import React, { useState } from 'react';
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { useNavigate } = ReactRouterDom;
import { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { Lock, ShoppingCart } from 'lucide-react';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { logoSrc } from '../assets/logo';
import TelegramImage from './TelegramImage';

interface CourseLockProps {
    course: Course;
}

const CourseLock: React.FC<CourseLockProps> = ({ course }) => {
    const { user, enrollInCourse } = useAuth();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePurchase = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setIsProcessing(true);
        try {
            const settingsRef = ref(db, 'settings/razorpay');
            const snapshot = await get(settingsRef);
            if (!snapshot.exists() || !snapshot.val().keyId) {
                (window as any).alert("Payment gateway is not configured. Please contact administrator.");
                setIsProcessing(false);
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
                    await enrollInCourse(course.id);
                    // Refresh page or navigate to show unlocked content
                    (window as any).location.reload();
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
                        setIsProcessing(false);
                    }
                }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error("Payment error", error);
            (window as any).alert("An error occurred while initiating payment.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl text-center shadow-sm h-full min-h-[400px]">
            <div className="bg-slate-200 p-4 rounded-full mb-4">
                <Lock size={48} className="text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">This content is locked</h2>
            <p className="text-slate-600 max-w-md mb-6">
                You need to purchase the <strong>{course.title}</strong> course to access this content.
            </p>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full max-w-sm mb-6">
                <div className="flex gap-4">
                     <TelegramImage src={course.thumbnail} alt={course.title} className="w-20 h-20 object-cover rounded-lg bg-slate-200" />
                     <div className="text-left">
                        <h3 className="font-bold text-slate-800 line-clamp-1">{course.title}</h3>
                        <p className="text-sm text-slate-500 mb-2">Full Access</p>
                        <p className="font-bold text-xl text-primary">₹{course.price.toLocaleString()}</p>
                     </div>
                </div>
            </div>

            <button 
                onClick={handlePurchase} 
                disabled={isProcessing}
                className="btn-primary px-8 py-3 text-lg shadow-lg flex items-center gap-2"
            >
                <ShoppingCart size={20} />
                {isProcessing ? 'Processing...' : 'Unlock Course Now'}
            </button>
        </div>
    );
};

export default CourseLock;
