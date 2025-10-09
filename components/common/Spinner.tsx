
import React from 'react';

const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div 
            className={`w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ${className}`}
            role="status"
        >
             <span className="sr-only">Loading...</span>
        </div>
    );
};

export default Spinner;
