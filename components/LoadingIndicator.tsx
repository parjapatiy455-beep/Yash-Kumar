import React from 'react';
import { useBranding } from '../hooks/useBranding';

interface LoadingIndicatorProps {
  fullscreen?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ fullscreen = false }) => {
  const { logoUrl } = useBranding();
  const wrapperClasses = fullscreen
    ? "fixed inset-0 bg-slate-50 flex items-center justify-center z-50"
    : "flex items-center justify-center py-20";

  return (
    <div className={wrapperClasses} role="status" aria-label="Loading content">
      <img
        src={logoUrl}
        alt="Loading..."
        className="w-32 h-auto animate-zoom-in"
      />
    </div>
  );
};

export default LoadingIndicator;