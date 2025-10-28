import React, { useState, useCallback, useRef } from 'react';
import { ArtRef, Sample, User } from '../types';
import Button from './common/Button';
import Select from './common/Select';
import TextArea from './common/TextArea';
import { fileToBase64, readImagesFromClipboard, downloadDataUrl, upscale2xDataURL } from '../utils/fileUtils';
import { ASPECT_RATIOS } from '../constants';
import { useTemplates } from '../hooks/useTemplates';
import ImageGrid from './common/ImageGrid';
import Spinner from './common/Spinner';
import ContextMenu from './common/ContextMenu';
import { SparkleInstance } from './common/Sparkle';

interface ArtColumnProps {
    artwork: string | null;
    previews: string[];
    currentIndex: number;
    onCurrentIndexChange: (index: number) => void;
    onArtworkApply: (b64: string) => void;
    artRefs: ArtRef[];
    onArtRefsChange: React.Dispatch<React.SetStateAction<ArtRef[]>>;
    samples: Sample[];
    onSamplesChange: React.Dispatch<React.SetStateAction<Sample[]>>;
    isLoading: boolean;
    onGenerate: (prompt: string, count: number, aspectRatio: string) => void;
    onCancel: () => void;
    user: User | null;
    onViewImage: (url: string) => void;
    onExpandImage: (source: { id: string, dataUrl: string }, ratio: string, sourceEl: HTMLElement) => void;
    sparkleRef: React.RefObject<SparkleInstance>;
    isUpscaled: boolean;
}

const ArtColumn: React.FC<ArtColumnProps> = ({
    artwork, previews, currentIndex, onCurrentIndexChange, onArtworkApply,
    artRefs, onArtRefsChange, samples, onSamplesChange,
    isLoading, onGenerate, onCancel, user,
    onViewImage, onExpandImage, sparkleRef, isUpscaled,
}) => {
    const [prompt, setPrompt] = useState('');
    const [count, setCount] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [isDraggingArtwork, setIsDraggingArtwork] = useState(false);
    const [isDraggingArt, setIsDraggingArt] = useState(false);
    const [isDraggingSample, setIsDraggingSample] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ position: { x: number, y: number } } | null>(null);
    const clickTimeoutRef = useRef<number | null>(null);

    const { templates: artRefTemplates } = useTemplates<ArtRef>('ARTREF_TEMPLATES');
    const { templates: sampleTemplates } = useTemplates<Sample>('SAMPLE_TEMPLATES');

    const handleArtworkAddFromFile = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const dataUrl = await fileToBase64(file);
                onArtworkApply(dataUrl);
            }
        };
        input.click();
    }, [onArtworkApply]);

    const handleArtworkPaste = useCallback(async () => {
        try {
            const dataUrls = await readImagesFromClipboard();
            if (dataUrls.length > 0) {
                onArtworkApply(dataUrls[0]);
            } else {
                 alert('No image found on clipboard.');
            }
        } catch (error: any) {
            alert(error.message);
        }
    }, [onArtworkApply]);
    
    const handleArtworkDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingArtwork(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const dataUrl = await fileToBase64(file);
                onArtworkApply(dataUrl);
            }
        }
    }, [onArtworkApply]);

    const handleAddFromFile = useCallback(async (setter: any) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files) return;
            for (const file of Array.from(files)) {
                const dataUrl = await fileToBase64(file);
                setter((prev: any[]) => [...prev, { id: `file-${Date.now()}-${Math.random()}`, name: file.name, dataUrl, createdAt: Date.now() }]);
            }
        };
        input.click();
    }, []);

    const handlePaste = useCallback(async (setter: any) => {
        try {
            const dataUrls = await readImagesFromClipboard();
            const newItems = dataUrls.map(dataUrl => ({
                id: `paste-${Date.now()}-${Math.random()}`,
                name: 'Pasted Image',
                dataUrl,
                createdAt: Date.now(),
            }));
            setter((prev: any[]) => [...prev, ...newItems]);
        } catch (error: any) {
            alert(error.message);
        }
    }, []);

    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        e.preventDefault();
        e.stopPropagation();
        setter(isEntering);
    };

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, setter: any, dragSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
        e.preventDefault();
        e.stopPropagation();
        dragSetter(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;
        
        for (const file of Array.from(files)) {
            // FIX: Add type guard to ensure 'file' is a File object, resolving errors where 'file' was inferred as 'unknown'.
            if (file instanceof File && file.type.startsWith('image/')) {
                const dataUrl = await fileToBase64(file);
                setter((prev: any[]) => [...prev, { id: `dnd-${Date.now()}-${Math.random()}`, name: file.name, dataUrl, createdAt: Date.now() }]);
            }
        }
    }, []);

    const handleTemplateSelect = <T extends {dataUrl: string, name: string}>(
        name: string, 
        templates: T[], 
        setter: (items: T[]) => void
    ) => {
        if (!name) {
            setter([]);
            return;
        }
        const group = templates.filter(t => t.name === name);
        setter(group as any);
    };

    const currentImage = previews.length > 0 ? previews[currentIndex] : artwork;

    const handleImageSave = async (e: React.MouseEvent<HTMLImageElement>) => {
        e.preventDefault();
        if (!currentImage) return;
        const rect = e.currentTarget.getBoundingClientRect();
        sparkleRef.current?.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12);
        const dataToSave = isUpscaled ? await upscale2xDataURL(currentImage) : currentImage;
        downloadDataUrl(dataToSave, `artwork-${Date.now()}.png`);
    };

    const handleImageContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
        e.preventDefault();
        if (!currentImage) return;
        setContextMenu({ position: { x: e.clientX, y: e.clientY } });
    };

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!currentImage) return;

        if (clickTimeoutRef.current) {
            // Double click
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            handleImageSave(e);
        } else {
            // Single click
            clickTimeoutRef.current = window.setTimeout(() => {
                if (currentImage) {
                    onViewImage(currentImage);
                }
                clickTimeoutRef.current = null;
            }, 300);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col min-h-0 backdrop-blur-lg h-full overflow-y-auto">
            <h2 className="text-lg font-bold mb-2">Artwork</h2>
            <div 
                onDragEnter={(e) => handleDragEvent(e, true, setIsDraggingArtwork)}
                onDragOver={(e) => handleDragEvent(e, true, setIsDraggingArtwork)}
                onDragLeave={(e) => handleDragEvent(e, false, setIsDraggingArtwork)}
                onDrop={handleArtworkDrop}
                className={`relative group h-[34vh] min-h-[240px] flex items-center justify-center rounded-xl bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#2a2a44_0%_50%)] bg-[0_0/20px_20px] border border-[#33334d] overflow-hidden animate-glow transition-all ${isDraggingArtwork ? 'border-2 border-dashed border-blue-500 bg-blue-500/10' : ''}`}
            >
                {currentImage && (
                    <img 
                        id="main-artwork-image"
                        src={currentImage} 
                        className="max-w-full max-h-full object-contain rounded-lg cursor-pointer" 
                        alt="Artwork preview" 
                        title="Click to View, Double Click to Save, Right Click to Expand"
                        onClick={handleImageClick}
                        onContextMenu={handleImageContextMenu}
                    />
                )}
                 {!currentImage && (
                    <div className="text-center text-gray-400 p-4 pointer-events-none">
                        <p className="font-bold text-lg">{isDraggingArtwork ? 'Drop to Apply!' : 'Set Artwork'}</p>
                        <p className="text-sm">{isDraggingArtwork ? '' : 'Drag & drop, paste, or add a file.'}</p>
                    </div>
                )}
                {previews.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onCurrentIndexChange((currentIndex - 1 + previews.length) % previews.length); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Previous image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        
                        <button
                            onClick={(e) => { e.stopPropagation(); onCurrentIndexChange((currentIndex + 1) % previews.length); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Next image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        
                        <div className="absolute right-3 bottom-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{`${currentIndex + 1} / ${previews.length}`}</div>
                    </>
                )}
            </div>
            
            <h3 className="text-base font-bold mt-4 mb-2">Generate Artwork</h3>
            <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Ratio</label>
                    <Select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                        {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Images</label>
                    <Select value={count} onChange={e => setCount(Number(e.target.value))}>
                        {[1, 2, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                </div>
            </div>
            <TextArea placeholder="Describe the artwork..." value={prompt} onChange={e => setPrompt(e.target.value)} className="h-24" />
            <div className="flex items-center gap-2 mt-2">
                <Button variant="ghost" onClick={() => onGenerate(prompt, count, aspectRatio)} disabled={isLoading || !prompt}>
                    {isLoading ? <><Spinner className="mr-2"/> Generating...</> : 'Generate'}
                </Button>
                <Button variant="primary" onClick={() => onArtworkApply(previews[currentIndex])} disabled={previews.length === 0}>Apply</Button>
                <div className="h-6 w-px bg-white/20 mx-1"></div>
                <Button variant="ghost" onClick={handleArtworkAddFromFile}>Add</Button>
                <Button variant="ghost" onClick={handleArtworkPaste}>Paste</Button>
                {isLoading && <Button variant="warn" onClick={onCancel} className="ml-auto">Cancel</Button>}
            </div>

            <div 
                onDragEnter={(e) => handleDragEvent(e, true, setIsDraggingArt)}
                onDragOver={(e) => handleDragEvent(e, true, setIsDraggingArt)}
                onDragLeave={(e) => handleDragEvent(e, false, setIsDraggingArt)}
                onDrop={(e) => handleDrop(e, onArtRefsChange, setIsDraggingArt)}
                className={`p-2 rounded-lg border-2 border-dashed transition-colors ${isDraggingArt ? 'border-blue-500 bg-blue-500/10' : 'border-transparent'}`}
            >
                <h3 className="text-base font-bold mt-2 mb-2">Artwork References</h3>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" onClick={() => handleAddFromFile(onArtRefsChange)}>Add</Button>
                    <Button variant="ghost" onClick={() => handlePaste(onArtRefsChange)}>Paste</Button>
                    <Select 
                        className="max-w-[180px] ml-auto"
                        onChange={(e) => handleTemplateSelect(e.target.value, artRefTemplates, onArtRefsChange as any)}
                        value={artRefs.length > 0 ? artRefTemplates.find(t => t.name === artRefs[0].name)?.name || "" : ""}
                    >
                        <option value="">— Use Template —</option>
                        {[...new Set(artRefTemplates.map(t => t.name))].map(name => <option key={name} value={name}>{name}</option>)}
                    </Select>
                </div>
                <ImageGrid items={artRefs} onItemsChange={onArtRefsChange} />
            </div>

            <div
                onDragEnter={(e) => handleDragEvent(e, true, setIsDraggingSample)}
                onDragOver={(e) => handleDragEvent(e, true, setIsDraggingSample)}
                onDragLeave={(e) => handleDragEvent(e, false, setIsDraggingSample)}
                onDrop={(e) => handleDrop(e, onSamplesChange, setIsDraggingSample)}
                className={`p-2 rounded-lg border-2 border-dashed transition-colors ${isDraggingSample ? 'border-blue-500 bg-blue-500/10' : 'border-transparent'}`}
            >
                <h3 className="text-base font-bold mt-2 mb-2">Product Samples</h3>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" onClick={() => handleAddFromFile(onSamplesChange)}>Add</Button>
                    <Button variant="ghost" onClick={() => handlePaste(onSamplesChange)}>Paste</Button>
                     <Select 
                        className="max-w-[180px] ml-auto"
                        onChange={(e) => handleTemplateSelect(e.target.value, sampleTemplates, onSamplesChange as any)}
                        value={samples.length > 0 ? sampleTemplates.find(t => t.name === samples[0].name)?.name || "" : ""}
                    >
                        <option value="">— Use Template —</option>
                        {[...new Set(sampleTemplates.map(t => t.name))].map(name => <option key={name} value={name}>{name}</option>)}
                    </Select>
                </div>
                <ImageGrid items={samples} onItemsChange={onSamplesChange} />
            </div>
            
            {contextMenu && (
                <ContextMenu
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onSelect={(ratio) => {
                        const sourceEl = document.getElementById('main-artwork-image');
                        if (currentImage && sourceEl) {
                            const imageSource = { id: 'main-artwork-image', dataUrl: currentImage };
                            onExpandImage(imageSource, ratio, sourceEl as HTMLElement);
                        }
                        setContextMenu(null);
                    }}
                />
            )}

            <style>{`
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 8px 24px rgba(0,0,0,.35); }
                    50% { box-shadow: 0 0 0 1px rgba(255,255,255,.18) inset, 0 18px 36px rgba(0,0,0,.45); }
                }
                .animate-glow { animation: glow 3.6s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default ArtColumn;