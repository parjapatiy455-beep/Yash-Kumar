

import React from 'react';
// FIX: Removed import of `Outlet` which is a react-router-dom v6 component.
import Navbar from './Navbar';
import Footer from './Footer';



// FIX: Modified component to accept and render children for v5 compatibility.
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default PublicLayout;
