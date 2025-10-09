import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MOCKUP_ASPECT_RATIOS } from '../../constants';

interface ContextMenuProps {
    position: { x: number, y: number };
    onClose: () => void;
    onSelect: (ratio: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ position, onClose, onSelect }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const menuContent = (
        <div 
            ref={menuRef}
            className="fixed z-[101] animate-fade-in-fast"
            style={{ left: position.x + 2, top: position.y + 2 }}
            onContextMenu={(e) => e.preventDefault()} // Prevent another context menu
        >
            <div 
                className="bg-gray-900/80 border border-white/20 rounded-xl p-2 min-w-[160px] backdrop-blur-md shadow-2xl"
            >
                <div className="px-2 py-1 font-bold text-gray-300 text-sm">Expand Image</div>
                <div className="grid grid-cols-2 gap-1 mt-1">
                    {MOCKUP_ASPECT_RATIOS.map(ratio => (
                        <button 
                            key={ratio}
                            onClick={() => onSelect(ratio)}
                            className="w-full text-left p-2 rounded-md hover:bg-white/10 text-white transition-colors text-sm"
                        >
                            {ratio}
                        </button>
                    ))}
                </div>
            </div>
             <style>
                {`
                @keyframes fade-in-fast {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out; }
                `}
            </style>
        </div>
    );

    return ReactDOM.createPortal(menuContent, document.body);
};

export default ContextMenu;