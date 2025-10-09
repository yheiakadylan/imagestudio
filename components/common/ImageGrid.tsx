
import React from 'react';

interface GridItem {
    id: string;
    dataUrl: string;
}

interface ImageGridProps<T extends GridItem> {
    items: T[];
    onItemsChange: (items: T[]) => void;
}

const ImageGrid = <T extends GridItem>({ items, onItemsChange }: ImageGridProps<T>) => {
    const handleRemove = (id: string) => {
        onItemsChange(items.filter(item => item.id !== id));
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map(item => (
                <div key={item.id} className="relative group aspect-square">
                    <img 
                        src={item.dataUrl} 
                        alt="Grid item"
                        className="w-full h-full object-cover rounded-lg border-2 border-white/10"
                    />
                    <button 
                        onClick={() => handleRemove(item.id)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ImageGrid;
