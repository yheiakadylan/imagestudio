import React from 'react';

interface ToggleSwitchProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, label }) => {
    const handleClick = () => {
        onChange(!enabled);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow toggling with spacebar and enter, as is standard
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <label 
            className="flex items-center cursor-pointer select-none"
            // Add event handlers and make it focusable for accessibility
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            // Add ARIA role for screen readers
            role="switch"
            aria-checked={enabled}
        >
            <div className="relative pointer-events-none"> {/* pointer-events-none to prevent double clicks */}
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
            {label && <span className="ml-2 text-sm text-gray-300 pointer-events-none">{label}</span>}
        </label>
    );
};

export default ToggleSwitch;