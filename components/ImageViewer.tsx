
import React from 'react';

interface ImageViewerProps {
    imageUrl: string | null;
    onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={onClose}
        >
            <img 
                src={imageUrl} 
                alt="Full-size view"
                className="max-w-[94vw] max-h-[94vh] rounded-2xl shadow-2xl shadow-black/50 object-contain"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
            />
            <style>
                {`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
                `}
            </style>
        </div>
    );
};

export default ImageViewer;
