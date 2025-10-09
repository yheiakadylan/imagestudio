import React from 'react';
import { Status } from '../types';
import Spinner from './common/Spinner';

interface StatusToastProps {
    status: Status;
}

const StatusToast: React.FC<StatusToastProps> = ({ status }) => {
    const { message, type, visible } = status;
    
    const baseClasses = "fixed left-1/2 top-4 -translate-x-1/2 h-10 flex gap-3 items-center justify-center font-bold text-white bg-white/10 border border-white/20 rounded-xl px-4 transition-all duration-300 backdrop-blur-md z-50";
    
    const typeClasses = {
        ok: 'bg-green-800/80 border-green-500',
        err: 'bg-red-800/80 border-red-500',
        info: 'bg-white/10 border-white/20',
        // FIX: Added 'warn' type for styling warning toasts.
        warn: 'bg-yellow-800/80 border-yellow-500',
    };

    const visibilityClasses = visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none';

    return (
        <div className={`${baseClasses} ${typeClasses[type]} ${visibilityClasses}`}>
            {type === 'info' && visible && <Spinner />}
            <span>{message}</span>
        </div>
    );
};

export default StatusToast;