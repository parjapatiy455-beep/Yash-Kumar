
import React, { useState, useEffect, FormEvent } from 'react';
import { Settings, Image, Palette, Key, Mail, Save, DollarSign, Plus, Trash2, BrainCircuit } from 'lucide-react';
import { db } from '../../firebase';
// FIX: Switched to v9 modular imports.
import { ref, get, update } from 'firebase/database';
import LoadingIndicator from '../../components/LoadingIndicator';

const AdminSettings: React.FC = () => {
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [razorpayKeyId, setRazorpayKeyId] = useState('');
    const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
    const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
    const [newGeminiKey, setNewGeminiKey] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                // FIX: Use v9 database syntax.
                const settingsRef = ref(db, 'settings');
                const snapshot = await get(settingsRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setBotToken(data.telegram?.botToken || '');
                    setChatId(data.telegram?.chatId || '');
                    setRazorpayKeyId(data.razorpay?.keyId || '');
                    setRazorpayKeySecret(data.razorpay?.keySecret || '');
                    if (data.gemini?.apiKeys) {
                        setGeminiKeys(Array.isArray(data.gemini.apiKeys) ? data.gemini.apiKeys : Object.values(data.gemini.apiKeys));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
                setFeedback({ message: 'Could not load settings.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setFeedback({ message: 'Saving...', type: 'info' });
        try {
            const updates: any = {};
            
            // Flatten updates to avoid overwriting other potential child nodes if structure changes
            updates['settings/telegram/botToken'] = botToken.trim();
            updates['settings/telegram/chatId'] = chatId.trim();
            
            updates['settings/razorpay/keyId'] = razorpayKeyId.trim();
            updates['settings/razorpay/keySecret'] = razorpayKeySecret.trim();
            
            updates['settings/gemini/apiKeys'] = geminiKeys;

            // FIX: Use update instead of set to safely merge changes
            await update(ref(db), updates);

            setFeedback({ message: 'Settings saved successfully!', type: 'success' });
        } catch (error) {
            console.error("Failed to save settings:", error);
            setFeedback({ message: `Failed to save settings: ${(error as Error).message}`, type: 'error' });
        }
        setTimeout(() => setFeedback(null), 3000);
    };

    const addGeminiKey = () => {
        if (newGeminiKey.trim()) {
            setGeminiKeys([...geminiKeys, newGeminiKey.trim()]);
            setNewGeminiKey('');
        }
    };

    const removeGeminiKey = (index: number) => {
        const newKeys = [...geminiKeys];
        newKeys.splice(index, 1);
        setGeminiKeys(newKeys);
    };

    if (loading) {
        return <LoadingIndicator />;
    }

    return (
        <div className="opacity-0 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Settings</h1>
            
            {feedback && (
                <div className={`p-4 mb-6 rounded-lg text-sm ${
                    feedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' :
                    feedback.type === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                }`} role="alert">
                    <span className="font-medium capitalize">{feedback.type}!</span> {feedback.message}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                
                {/* AI Settings - New Feature */}
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
                     <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                        <BrainCircuit className="text-purple-600"/> AI Tutor Configuration (Gemini)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Add multiple Gemini API Keys. The system will randomly pick one for each request to distribute load.</p>
                    <div className="border-t border-slate-200 pt-6 mt-4 space-y-4">
                        <div>
                             <label className="label-style">Add New API Key</label>
                             <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={newGeminiKey} 
                                    onChange={(e) => setNewGeminiKey(e.target.value)} 
                                    className="input-style" 
                                    placeholder="Paste Gemini API Key here..."
                                />
                                <button type="button" onClick={addGeminiKey} className="btn-secondary whitespace-nowrap">
                                    <Plus size={18} /> Add Key
                                </button>
                             </div>
                        </div>
                        
                        {geminiKeys.length > 0 && (
                            <div className="space-y-2">
                                <label className="label-style">Active Keys ({geminiKeys.length})</label>
                                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    {geminiKeys.map((key, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 border-b border-slate-200 last:border-0">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Key size={16} className="text-slate-400 flex-shrink-0" />
                                                <span className="text-sm font-mono text-slate-600 truncate">
                                                    {key.substring(0, 8)}...{key.substring(key.length - 6)}
                                                </span>
                                            </div>
                                            <button type="button" onClick={() => removeGeminiKey(idx)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-md transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Telegram Settings */}
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                        <Key className="text-primary"/> Telegram Bot Settings
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">This token is used to fetch files like thumbnails and PDFs stored via Telegram.</p>
                    <div className="border-t border-slate-200 pt-6 mt-4 space-y-4">
                        <div>
                            <label htmlFor="botToken" className="label-style">Bot Token</label>
                            <input id="botToken" name="botToken" type="password" value={botToken} onChange={(e) => setBotToken((e.target as any).value)} className="input-style" placeholder="Enter your Telegram Bot Token"/>
                        </div>
                        <div>
                            <label htmlFor="chatId" className="label-style">Chat ID (Optional)</label>
                            <input id="chatId" name="chatId" type="text" value={chatId} onChange={(e) => setChatId((e.target as any).value)} className="input-style" placeholder="Enter the chat/channel ID if needed"/>
                        </div>
                    </div>
                </div>

                {/* Razorpay Settings */}
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-500"/> Razorpay Payment Gateway
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Configure your Razorpay API keys to accept payments for courses.</p>
                    <div className="border-t border-slate-200 pt-6 mt-4 space-y-4">
                        <div>
                            <label htmlFor="razorpayKeyId" className="label-style">Key ID</label>
                            <input id="razorpayKeyId" name="razorpayKeyId" type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId((e.target as any).value)} className="input-style" placeholder="rzp_test_... or rzp_live_..."/>
                        </div>
                        <div>
                            <label htmlFor="razorpayKeySecret" className="label-style">Key Secret</label>
                            <input id="razorpayKeySecret" name="razorpayKeySecret" type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret((e.target as any).value)} className="input-style" placeholder="Enter your Key Secret"/>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button type="submit" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-lg shadow-md transition-all">
                        <Save size={18} /> Save All Settings
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettings;
