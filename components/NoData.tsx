import React from 'react';

interface NoDataProps {
    message?: string;
    className?: string;
}

const NoData: React.FC<NoDataProps> = ({ message = "No Data Found", className = "" }) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
            <img 
                src="https://pw-battle-ground-mfe.pw.live/static/image/no-data-found.bb9c3b03.gif" 
                alt="No Data" 
                className="w-64 h-auto mb-4 mix-blend-multiply object-contain"
            />
            {message && <p className="text-slate-500 font-medium text-lg">{message}</p>}
        </div>
    );
};

export default NoData;