import React, { useState, useRef, useContext } from 'react';
import { ExpandedNode, User, LogEntry, MockupPrompt, ArtRef, Sample, CutTemplate, Status } from './types';
import ArtColumn from './components/ArtColumn';
import CutColumn from './components/CutColumn';
import MockupColumn from './components/MockupColumn';
import Header from './components/Header';
import StatusToast from './components/StatusToast';
import ImageViewer from './components/ImageViewer';
import ExpandedNodeComponent from './components/viewer/ExpandedNode';
import SettingsModal from './components/SettingsModal';
import ImageLogModal from './components/ImageLogModal';
import { Sparkle, SparkleInstance } from './components/common/Sparkle';
import * as geminiService from './services/geminiService';
import { downscaleDataUrl, downloadDataUrl, upscale2xDataURL } from './utils/fileUtils';
import { EXPAND_PROMPT_DEFAULT } from './constants';
import { AuthContext } from './contexts/AuthContext';
import { useImageLog } from './hooks/useImageLog';
import { useApiKeys } from './hooks/useApiKeys';
import ConnectionLines from './components/viewer/ConnectionLines';
import ImageEditor from './components/ImageEditor';


const App: React.FC = () => {
    const [artwork, setArtwork] = useState<string | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [artRefs, setArtRefs] = useState<ArtRef[]>([]);
    const [samples, setSamples] = useState<Sample[]>([]);
    const [cutTemplate, setCutTemplate] = useState<CutTemplate | null>(null);
    const [currentMockups, setCurrentMockups] = useState<LogEntry[]>([]);

    const auth = useContext(AuthContext);
    const { log: generationLog, addResultToLog, deleteResultsFromLog } = useImageLog(auth.user);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
    const [status, setStatus] = useState<Status>({ message: '', type: 'info', visible: false });

    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<ExpandedNode[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isImageLogOpen, setIsImageLogOpen] = useState(false);
    const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
    const [isUpscaled, setIsUpscaled] = useState(false);
    
    const sparkleRef = useRef<SparkleInstance>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { apiKeys } = useApiKeys(auth.user);

    const userApiKey = apiKeys.find(k => k.id === auth.user?.apiKeyId)?.key;

    const showStatus = (message: string, type: Status['type'] = 'info', duration = 3000) => {
        setStatus({ message, type, visible: true });
        setTimeout(() => setStatus(s => ({ ...s, visible: false })), duration);
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsLoading(false);
        setProgress({ done: 0, total: 0, label: '' });
        showStatus('Generation cancelled', 'warn');
    };

    const handleGenerateArt = async (prompt: string, count: number, aspectRatio: string) => {
        if (!userApiKey) {
            showStatus('Your account does not have an API key assigned.', 'err');
            return;
        }
        setIsLoading(true);
        setPreviews([]);
        setCurrentIndex(0);
        showStatus(`Generating ${count} artwork(s)...`, 'info');
        
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        try {
            const refUrls = await Promise.all(artRefs.map(r => downscaleDataUrl(r.dataUrl)));
            
            const generatedImages = await geminiService.generateArtwork(prompt, aspectRatio, refUrls, count, userApiKey);
    
            if (signal.aborted) {
                throw new Error("Operation cancelled by user.");
            }
    
            setPreviews(generatedImages);
    
            for (let i = 0; i < generatedImages.length; i++) {
                const url = generatedImages[i];
                await addResultToLog({
                    id: `art-${Date.now()}-${i}`,
                    type: 'artwork',
                    prompt,
                    dataUrl: url,
                    createdAt: Date.now()
                });
            }
    
            showStatus(`Generated ${generatedImages.length} artwork(s)!`, 'ok');
        } catch (error: any) {
            console.error('Artwork generation failed:', error);
            if (error.message.includes("cancelled by user")) {
                showStatus('Artwork generation cancelled', 'warn');
            } else {
                showStatus(error.message || 'Artwork generation failed', 'err');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleApplyArtwork = (b64: string) => {
        setArtwork(b64);
        setPreviews([]);
        setCurrentIndex(0);
        showStatus('Artwork applied!', 'ok');
    };

    const handleGenerateMockups = async (prompts: MockupPrompt[], count: number, aspectRatio: string) => {
        if (!artwork) {
            showStatus('Please apply an artwork first.', 'err');
            return;
        }
        if (!userApiKey) {
            showStatus('Your account does not have an API key assigned.', 'err');
            return;
        }
    
        setCurrentMockups([]); // Clear previous results from the UI
        setIsLoading(true);
        const totalJobs = prompts.length * count;
        setProgress({ done: 0, total: totalJobs, label: 'Generating mockups...' });
        
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;
    
        try {
            const downscaledArtwork = await downscaleDataUrl(artwork);
            const downscaledSamples = await Promise.all(samples.map(s => downscaleDataUrl(s.dataUrl)));
    
            let jobsCompleted = 0;
            for (const prompt of prompts) {
                for (let i = 0; i < count; i++) {
                    if (signal.aborted) {
                        throw new Error("Operation cancelled by user.");
                    }
                    
                    const resultId = `${prompt.id}-${i}-${Date.now()}`;
                    
                    try {
                        const resultUrl = await geminiService.generateMockup(prompt.prompt, aspectRatio, downscaledSamples, downscaledArtwork, userApiKey);
                        if (signal.aborted) throw new Error("Operation cancelled by user.");
                        const newEntry: LogEntry = { id: resultId, type: 'mockup', prompt: prompt.prompt, dataUrl: resultUrl, createdAt: Date.now() };
                        await addResultToLog(newEntry);
                        setCurrentMockups(prev => [newEntry, ...prev]);
                    } catch (error: any) {
                        if (signal.aborted) throw new Error("Operation cancelled by user.");
                        const newEntry: LogEntry = { id: resultId, type: 'mockup', prompt: prompt.prompt, dataUrl: '', error: error.message || 'Generation failed', createdAt: Date.now() };
                        await addResultToLog(newEntry);
                        setCurrentMockups(prev => [newEntry, ...prev]);
                    } finally {
                        if (!signal.aborted) {
                            jobsCompleted++;
                            setProgress(p => ({ ...p, done: jobsCompleted }));
                        }
                    }
                }
            }
    
            if (!signal.aborted) {
                showStatus(`Finished generating ${totalJobs} mockups.`, 'ok');
            }
        } catch (error: any) {
             if (error.message.includes("cancelled by user")) {
                showStatus('Mockup generation cancelled', 'warn');
            } else {
                console.error('Mockup generation failed:', error);
                showStatus(error.message || 'Mockup generation failed', 'err');
            }
        } finally {
            setIsLoading(false);
            setProgress({ done: 0, total: 0, label: '' });
        }
    };

    const handleExpandImage = async (source: { id: string; dataUrl: string }, ratio: string, sourceEl: HTMLElement) => {
        if (!userApiKey) {
            showStatus('Your account does not have an API key assigned.', 'err');
            return;
        }
        showStatus('Expanding image...', 'info');
        try {
            const downscaledSource = await downscaleDataUrl(source.dataUrl);
            const [expandedUrl] = await geminiService.generateArtwork(EXPAND_PROMPT_DEFAULT, ratio, [downscaledSource], 1, userApiKey);
            const rect = sourceEl.getBoundingClientRect();
            
            const newNode: ExpandedNode = {
                id: `expand-${Date.now()}`,
                sourceId: source.id,
                dataUrl: expandedUrl,
                ratioLabel: ratio,
                position: { x: rect.right - 420, y: rect.top - 50 },
            };
            setExpandedNodes(prev => [...prev, newNode]);
            sparkleRef.current?.burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
            showStatus('Image expanded!', 'ok');
        } catch (error: any) {
            showStatus(error.message || 'Failed to expand image', 'err');
        }
    };

    const handleNodePositionChange = (id: string, pos: { x: number; y: number }) => {
        setExpandedNodes(nodes => nodes.map(n => n.id === id ? { ...n, position: pos } : n));
    };

    const handleCloseNode = (id: string) => {
        setExpandedNodes(nodes => nodes.filter(n => n.id !== id));
    };

    const handleSaveAllExpanded = async () => {
        if (expandedNodes.length === 0) {
            showStatus('No expanded images to save.', 'info');
            return;
        }
    
        showStatus(`Saving ${expandedNodes.length} expanded image(s)...`, 'info');
        let savedCount = 0;
        try {
            for (const node of expandedNodes) {
                const dataToSave = isUpscaled ? await upscale2xDataURL(node.dataUrl) : node.dataUrl;
                downloadDataUrl(dataToSave, `expanded-${node.ratioLabel}-${node.id.slice(-6)}.png`);
                savedCount++;
                // Add a small delay between downloads to prevent browser issues
                await new Promise(res => setTimeout(res, 200));
            }
            showStatus(`Successfully saved ${savedCount} expanded image(s).`, 'ok');
        } catch (error: any) {
            showStatus(`Failed to save all expanded images: ${error.message}`, 'err');
        }
    };

    return (
        <div className="w-screen h-screen bg-[#0d0c1c] text-white flex flex-col font-sans overflow-hidden">
            <Sparkle ref={sparkleRef} />
            <Header 
                onSettingsClick={() => setIsSettingsOpen(true)} 
                onImageLogClick={() => setIsImageLogOpen(true)}
                onImageEditorClick={() => setIsImageEditorOpen(true)}
            />
            <StatusToast status={status} />
            <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <ImageLogModal 
                isOpen={isImageLogOpen} 
                onClose={() => setIsImageLogOpen(false)}
                results={generationLog}
                onDelete={deleteResultsFromLog}
                showStatus={showStatus}
                user={auth.user}
                allUsers={auth.users}
            />
            <ImageEditor
                isOpen={isImageEditorOpen}
                onClose={() => setIsImageEditorOpen(false)}
                showStatus={showStatus}
                user={auth.user}
            />
            
            <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 min-h-0">
                <ArtColumn
                    artwork={artwork}
                    previews={previews}
                    currentIndex={currentIndex}
                    onCurrentIndexChange={setCurrentIndex}
                    onArtworkApply={handleApplyArtwork}
                    artRefs={artRefs}
                    onArtRefsChange={setArtRefs}
                    samples={samples}
                    onSamplesChange={setSamples}
                    isLoading={isLoading && progress.total === 0}
                    onGenerate={handleGenerateArt}
                    onCancel={handleCancel}
                    user={auth.user}
                    onViewImage={setViewingImage}
                    onExpandImage={handleExpandImage}
                    sparkleRef={sparkleRef}
                    isUpscaled={isUpscaled}
                />
                <CutColumn
                    artwork={artwork}
                    template={cutTemplate}
                    onTemplateChange={setCutTemplate}
                    user={auth.user as User}
                />
                <MockupColumn
                    isLoading={isLoading && progress.total > 0}
                    progress={progress}
                    results={currentMockups}
                    onGenerate={handleGenerateMockups}
                    onCancel={handleCancel}
                    onViewImage={setViewingImage}
                    onExpandImage={handleExpandImage}
                    sparkleRef={sparkleRef}
                    isUpscaled={isUpscaled}
                    onUpscaleChange={setIsUpscaled}
                    onSaveAllExpanded={handleSaveAllExpanded}
                    user={auth.user}
                />
            </main>
            
            <div className="absolute inset-0 pointer-events-none z-40">
                <ConnectionLines nodes={expandedNodes} />
                {expandedNodes.map(node => (
                    <ExpandedNodeComponent
                        key={node.id}
                        node={node}
                        onClose={handleCloseNode}
                        onPositionChange={handleNodePositionChange}
                        onViewImage={setViewingImage}
                        sparkleRef={sparkleRef}
                        isUpscaled={isUpscaled}
                    />
                ))}
            </div>
        </div>
    );
};

export default App;
