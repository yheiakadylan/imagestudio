import React from 'react';

interface ToggleSwitchProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, label }) => {
    return (
        <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
                <div className={`
                    w-11 h-6 rounded-full shadow-inner transition-colors
                    ${enabled ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-white/20'}
                `}></div>
                <div className={`
                    absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow
                    transition-transform transform
                    ${enabled ? 'translate-x-5' : 'translate-x-0'}
                `}></div>
            </div>
            {label && <span className="ml-2 text-sm text-gray-300">{label}</span>}
        </label>
    );
};

export default ToggleSwitch;