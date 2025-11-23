
import React from 'react';

const AITestGeneratorPage: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-slate-800 font-sans">
            {/* The iframe takes up the full screen for a focused experience */}
            <iframe
                src="https://study.nextgrabo.com/"
                title="AI Test Generator"
                className="w-full h-full border-0"
                allow="fullscreen"
            />
        </div>
    );
};

export default AITestGeneratorPage;
