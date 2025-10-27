import React, { useState, useMemo, useEffect } from 'react';
import { LogEntry, Status, User } from '../types';
import Button from './common/Button';
import { downloadDataUrl } from '../utils/fileUtils';
import Select from './common/Select';

interface ImageLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: LogEntry[];
    onDelete: (ids: string[]) => void;
    showStatus: (message: string, type: Status['type'], duration?: number) => void;
    user: User | null;
    allUsers: User[];
}

const ImageLogModal: React.FC<ImageLogModalProps> = ({ isOpen, onClose, results, onDelete, showStatus, user, allUsers }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedUserId, setSelectedUserId] = useState('all');

    useEffect(() => {
        // Clear selection when filter changes to avoid confusion
        if (isOpen) {
            setSelectedIds(new Set());
        }
    }, [selectedUserId, isOpen]);

    const filteredResults = useMemo(() => {
        if (user?.role === 'admin' && selectedUserId !== 'all') {
            return results.filter(result => result.ownerUid === selectedUserId);
        }
        return results;
    }, [results, user, selectedUserId]);

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

    const handleSelectAll = () => {
        setSelectedIds(new Set(filteredResults.map(r => r.id)));
    };

    const handleDeselectAll = () => {
        setSelectedIds(new Set());
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
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10 flex-wrap gap-y-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">Image Generation Log</h2>
                        {user?.role === 'admin' && (
                             <div className="flex items-center gap-2">
                                <label htmlFor="user-filter" className="text-sm text-gray-400 flex-shrink-0">Filter:</label>
                                <Select
                                    id="user-filter"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="!py-1.5 !px-3 text-sm !w-auto"
                                >
                                    <option value="all">All Users</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button variant="ghost" onClick={handleSelectAll} disabled={filteredResults.length === 0}>
                            Select All
                        </Button>
                        <Button variant="ghost" onClick={handleDeselectAll} disabled={selectedIds.size === 0}>
                            Deselect All
                        </Button>
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
                    {filteredResults.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No images have been generated for the selected filter.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {filteredResults.map(result => (
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