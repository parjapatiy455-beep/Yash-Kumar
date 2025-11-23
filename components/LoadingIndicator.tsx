import React from 'react';
import { logoSrc } from '../assets/logo';

interface LoadingIndicatorProps {
  fullscreen?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ fullscreen = false }) => {
  const wrapperClasses = fullscreen
    ? "fixed inset-0 bg-slate-50 flex items-center justify-center z-50"
    : "flex items-center justify-center py-20";

  return (
    <div className={wrapperClasses} role="status" aria-label="Loading content">
      <img
        src={logoSrc}
        alt="VedPath Logo"
        className="w-32 h-auto animate-zoom-in"
      />
    </div>
  );
};

export default LoadingIndicator;