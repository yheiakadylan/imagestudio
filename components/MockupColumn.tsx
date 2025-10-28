import React, { useState, useMemo, useRef } from 'react';
import { Template, MockupPrompt, LogEntry, User } from '../types';
import Button from './common/Button';
import Select from './common/Select';
import TextArea from './common/TextArea';
import { MOCKUP_ASPECT_RATIOS } from '../constants';
import { useTemplates } from '../hooks/useTemplates';
import { downloadDataUrl, upscale2xDataURL } from '../utils/fileUtils';
import Spinner from './common/Spinner';
import { SparkleInstance } from './common/Sparkle';
import ContextMenu from './common/ContextMenu';
import ToggleSwitch from './common/ToggleSwitch';

interface MockupColumnProps {
    isLoading: boolean;
    progress: { done: number; total: number; label: string };
    results: LogEntry[];
    onGenerate: (prompts: MockupPrompt[], count: number, aspectRatio: string) => void;
    onCancel: () => void;
    onViewImage: (url: string) => void;
    onExpandImage: (source: { id: string, dataUrl: string }, ratio: string, sourceEl: HTMLElement) => void;
    sparkleRef: React.RefObject<SparkleInstance>;
    isUpscaled: boolean;
    onUpscaleChange: (enabled: boolean) => void;
    onSaveAllExpanded: () => void;
    user: User | null;
}

const MockupColumn: React.FC<MockupColumnProps> = ({
    isLoading, progress, results, onGenerate, onCancel, onViewImage, onExpandImage, sparkleRef,
    isUpscaled, onUpscaleChange, onSaveAllExpanded, user
}) => {
    const [prompts, setPrompts] = useState('');
    const [count, setCount] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [sku, setSku] = useState('');
    const { templates: mockupTemplates } = useTemplates<Template>('TEMPLATES');
    
    const [contextMenu, setContextMenu] = useState<{ target: { logEntry: LogEntry, el: HTMLElement }; position: { x: number, y: number } } | null>(null);
    const clickTimeoutRef = useRef<number | null>(null);

    const parsedPrompts = useMemo((): MockupPrompt[] =>
        prompts.split('\n').map(p => p.trim()).filter(Boolean).map(p => ({ id: `prompt-${Math.random()}`, prompt: p }))
    , [prompts]);

    const handleGenerateClick = () => {
        if (parsedPrompts.length > 0) {
            onGenerate(parsedPrompts, count, aspectRatio);
        } else {
            alert('Please enter at least one mockup prompt.');
        }
    };
    
    const handleSaveAll = async () => {
        if (!sku) {
            alert("Please enter a SKU first.");
            return;
        }
        const validResults = results.filter(r => r.dataUrl && r.type === 'mockup');
        if (validResults.length === 0) {
            alert("No mockups to save.");
            return;
        }
        for (let i = 0; i < validResults.length; i++) {
            const result = validResults[i];
            const dataToSave = isUpscaled ? await upscale2xDataURL(result.dataUrl) : result.dataUrl;
            downloadDataUrl(dataToSave, `${sku}-${i + 1}.png`);
            await new Promise(res => setTimeout(res, 100));
        }
    };
    
    const handleImageSave = async (e: React.MouseEvent<HTMLImageElement>, result: LogEntry) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        sparkleRef.current?.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12);
        const dataToSave = isUpscaled ? await upscale2xDataURL(result.dataUrl) : result.dataUrl;
        downloadDataUrl(dataToSave, `${result.type}-${result.id}.png`);
    };

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>, result: LogEntry) => {
        if (clickTimeoutRef.current) {
            // Double click
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            handleImageSave(e, result);
        } else {
            // Single click
            clickTimeoutRef.current = window.setTimeout(() => {
                onViewImage(result.dataUrl);
                clickTimeoutRef.current = null;
            }, 300);
        }
    };

    const handleImageContextMenu = (e: React.MouseEvent<HTMLImageElement>, result: LogEntry) => {
        e.preventDefault();
        setContextMenu({
            target: { logEntry: result, el: e.currentTarget },
            position: { x: e.clientX, y: e.clientY }
        });
    };
    
    const mockupResults = useMemo(() => {
        return [...results].filter(r => r.type === 'mockup').sort((a, b) => b.createdAt - a.createdAt);
    }, [results]);

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col min-h-0 backdrop-blur-lg h-full">
            <div className="flex-shrink-0">
                <h2 className="text-lg font-bold mb-2">Generate Mockups</h2>
                <div className="grid grid-cols-3 gap-4 mb-2">
                    <Select onChange={(e) => setPrompts(e.target.value)}>
                        <option value="">— Use Template —</option>
                        {mockupTemplates.map(t => <option key={t.id} value={t.prompt}>{t.name}</option>)}
                    </Select>
                    <Select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                        {MOCKUP_ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <Select value={count} onChange={e => setCount(Number(e.target.value))}>
                        {[1, 2, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                </div>
                <TextArea placeholder="Describe background/placement... (1 line = 1 prompt)" value={prompts} onChange={e => setPrompts(e.target.value)} />
                <div className="mt-2">
                    <label className="text-sm text-gray-400 mb-1 block">SKU</label>
                    <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="ABC-001" className="w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none"/>
                </div>
                
                 {isLoading && (
                    <div className="mt-4">
                        <div className="flex justify-between items-center text-sm text-gray-300 mb-1">
                            <span>{progress.label}</span>
                            <span>{progress.done} / {progress.total}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2.5">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all" style={{ width: `${(progress.total > 0 ? progress.done / progress.total : 0) * 100}%` }}></div>
                        </div>
                    </div>
                )}
                
                <div className="flex items-center gap-2 mt-4">
                    <Button onClick={handleGenerateClick} disabled={isLoading || parsedPrompts.length === 0}>
                        {isLoading ? <><Spinner className="mr-2"/> Generating...</> : 'Generate'}
                    </Button>
                    {isLoading && <Button variant="warn" onClick={onCancel}>Cancel</Button>}
                    <div className="ml-auto flex items-center gap-3">
                        <ToggleSwitch enabled={isUpscaled} onChange={onUpscaleChange} label="Scale x2"/>
                        <Button variant="ghost" onClick={handleSaveAll} disabled={isLoading || mockupResults.length === 0 || !sku}>Save All</Button>
                        <Button variant="ghost" onClick={onSaveAllExpanded} disabled={isLoading}>Save All Expanded</Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 mt-4 overflow-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {mockupResults.map(result => (
                        <div key={result.id} className="aspect-square rounded-xl bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#2a2a44_0%_50%)] bg-[0_0/20px_20px] border border-white/20 flex items-center justify-center p-1 group relative">
                            {result.error ? (
                                <p className="text-red-400 text-xs text-center p-2">{result.error}</p>
                            ) : (
                                <img
                                    id={`log-item-${result.id}`}
                                    src={result.dataUrl}
                                    alt="Generated mockup"
                                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer"
                                    title="Click to View, Double Click to Save, Right Click to Expand"
                                    onClick={(e) => handleImageClick(e, result)}
                                    onContextMenu={(e) => handleImageContextMenu(e, result)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
             {contextMenu && (
                <ContextMenu
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onSelect={(ratio) => {
                        if (contextMenu.target) {
                            const { logEntry, el } = contextMenu.target;
                            const source = { id: `log-item-${logEntry.id}`, dataUrl: logEntry.dataUrl };
                            onExpandImage(source, ratio, el);
                        }
                        setContextMenu(null);
                    }}
                />
            )}
        </div>
    );
};

export default MockupColumn;