import React from 'react';
import { Twitter, Github, Linkedin } from 'lucide-react';
import { logoSrc } from '../assets/logo';

const Footer: React.FC = () => {
    return (
        <footer className="bg-white border-t border-slate-200 mt-auto">
            <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src={logoSrc} alt="LurnX Logo" className="h-10 w-auto rounded-md" />
                        <span className="text-xl font-bold text-slate-800">LurnX</span>
                    </div>
                    <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-6">
                        Empowering the next generation of learners through an intuitive, powerful, and accessible online education platform.
                    </p>
                    
                    <div className="flex justify-center space-x-8 mb-8">
                        <a href="#" aria-label="Twitter" className="text-slate-400 hover:text-primary transition-colors transform hover:scale-110">
                            <Twitter size={24} />
                        </a>
                        <a href="#" aria-label="GitHub" className="text-slate-400 hover:text-slate-900 transition-colors transform hover:scale-110">
                            <Github size={24} />
                        </a>
                        <a href="#" aria-label="LinkedIn" className="text-slate-400 hover:text-blue-700 transition-colors transform hover:scale-110">
                            <Linkedin size={24} />
                        </a>
                    </div>
                    
                    <div className="text-xs text-slate-400 border-t border-slate-100 pt-8 w-full">
                        <p>&copy; {new Date().getFullYear()} LurnX. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;