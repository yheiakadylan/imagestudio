import React, { useState } from 'react';
import { LogEntry, Status } from '../types';
import Button from './common/Button';
import { downloadDataUrl } from '../utils/fileUtils';

interface ImageLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: LogEntry[];
    onDelete: (ids: string[]) => void;
    showStatus: (message: string, type: Status['type'], duration?: number) => void;
}

const ImageLogModal: React.FC<ImageLogModalProps> = ({ isOpen, onClose, results, onDelete, showStatus }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleDeleteSelected = async () => {
        const count = selectedIds.size;
        if (count === 0) return;
        if (window.confirm(`Are you sure you want to delete ${count} image(s)? This cannot be undone.`)) {
            await onDelete(Array.from(selectedIds));
            showStatus(`${count} image(s) deleted.`, 'ok');
            setSelectedIds(new Set());
        }
    };

    const handleDownloadSelected = () => {
        if (selectedIds.size === 0) return;
        results.forEach(result => {
            if (selectedIds.has(result.id)) {
                downloadDataUrl(result.dataUrl, `${result.type}-${result.id}.png`);
            }
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/80 border border-white/20 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-2xl font-bold">Image Generation Log</h2>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={handleDownloadSelected} disabled={selectedIds.size === 0}>
                            Download ({selectedIds.size})
                        </Button>
                        <Button variant="warn" onClick={handleDeleteSelected} disabled={selectedIds.size === 0}>
                            Delete ({selectedIds.size})
                        </Button>
                        <Button variant="ghost" onClick={onClose} className="!px-3 !py-1">✕</Button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4">
                    {results.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No images have been generated yet.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {results.map(result => (
                                <div 
                                    key={result.id} 
                                    className={`relative aspect-square rounded-lg overflow-hidden bg-white/5 cursor-pointer group ${selectedIds.has(result.id) ? 'ring-4 ring-blue-500' : ''}`}
                                    onClick={() => handleToggleSelect(result.id)}
                                >
                                    {result.dataUrl ? (
                                        <img src={result.dataUrl} alt={result.prompt} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-center p-2 text-red-400 text-xs">
                                            <p>Error: {result.error}</p>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-md bg-black/60 capitalize">
                                        {result.type}
                                    </div>
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-md border-2 border-white bg-black/50 flex items-center justify-center">
                                        {selectedIds.has(result.id) && <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
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

export default ImageLogModal;