import React, { useState, useCallback, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useApiKeys } from '../hooks/useApiKeys';
import * as geminiService from '../services/geminiService';
import { fileToBase64, readImagesFromClipboard, getImageAspectRatio, downloadDataUrl } from '../utils/fileUtils';
import { Status, User } from '../types';

import Button from './common/Button';
import TextArea from './common/TextArea';
import Spinner from './common/Spinner';

// SVG icon for the empty upload state
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// SVG icon for the empty output state
const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25278C12 6.25278 14.8868 3.52702 17.5 5.50002C20.1132 7.47302 18.25 11.5 18.25 11.5C18.25 11.5 22 13.25 20.5 15.5C19 17.75 15.5 16 15.5 16C15.5 16 13.5 19.5 11 19.5C8.5 19.5 6.5 16 6.5 16C6.5 16 3 17.75 4.5 15.5C6 13.25 9.75 11.5 9.75 11.5C9.75 11.5 7.88675 7.47302 10.5 5.50002C11.3857 4.80932 12 6.25278 12 6.25278Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 13.5L6 11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 11L20.5 13.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4L9.5 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 2L16 4" />
    </svg>
);

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    showStatus: (message: string, type: Status['type'], duration?: number) => void;
    user: User | null;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ isOpen, onClose, showStatus, user }) => {
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const auth = useContext(AuthContext);
    const { apiKeys } = useApiKeys(auth.user);
    const userApiKey = apiKeys.find(k => k.id === auth.user?.apiKeyId)?.key;

    const resetState = useCallback(() => {
        setSourceImage(null);
        setOutputImage(null);
        setPrompt('');
        setIsLoading(false);
        setIsDragging(false);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleImageUpload = (dataUrl: string) => {
        setSourceImage(dataUrl);
        setOutputImage(null); // Clear previous output when new source is set
    };

    const handleAddFromFile = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const dataUrl = await fileToBase64(file);
                handleImageUpload(dataUrl);
            }
        };
        input.click();
    };

    const handleRemoveImage = () => {
        setSourceImage(null);
        setOutputImage(null);
    };

    const handlePaste = async () => {
        try {
            const dataUrls = await readImagesFromClipboard();
            if (dataUrls.length > 0) {
                handleImageUpload(dataUrls[0]);
                showStatus('Image pasted successfully!', 'ok');
            } else {
                showStatus('No image found on clipboard.', 'warn');
            }
        } catch (error: any) {
            showStatus(error.message, 'err');
        }
    };

    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files[0] && files[0].type.startsWith('image/')) {
            const dataUrl = await fileToBase64(files[0]);
            handleImageUpload(dataUrl);
        }
    };
    
    const handleGenerate = async () => {
        if (!sourceImage || !prompt.trim()) {
            showStatus('Please provide an image and a prompt.', 'warn');
            return;
        }
        if (!userApiKey) {
            showStatus('Your account does not have an API key assigned.', 'err');
            return;
        }

        setIsLoading(true);
        setOutputImage(null);

        try {
            const aspectRatio = await getImageAspectRatio(sourceImage);
            
            const finalPrompt = `Dựa trên hình ảnh được cung cấp, hãy thực hiện chỉnh sửa sau: "${prompt}". Điều cực kỳ quan trọng là phải duy trì phong cách của hình ảnh gốc, bao gồm phông chữ, màu sắc, chất liệu, và bố cục tổng thể. Các thay đổi phải liền mạch và trông tự nhiên.`;

            const [resultUrl] = await geminiService.generateArtwork(finalPrompt, aspectRatio, [sourceImage], 1, userApiKey);

            setOutputImage(resultUrl);
            showStatus('Image edited successfully!', 'ok');
        } catch (error: any) {
            console.error('Image editing failed:', error);
            showStatus(error.message || 'Image editing failed.', 'err');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadOutput = () => {
        if (outputImage) {
            downloadDataUrl(outputImage, `edited-image-${Date.now()}.png`);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={handleClose}
        >
            <div
                className="bg-[#0d0c1c]/90 border border-white/20 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl shadow-black/50"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Image Editor</h2>
                    <Button variant="ghost" onClick={handleClose} className="!px-3 !py-1 text-xl">✕</Button>
                </header>

                <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-0">
                    {/* ===== INPUT COLUMN ===== */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-gray-200 flex-shrink-0">1. Source Image</h3>
                        
                        <div 
                            onDragEnter={(e) => handleDragEvent(e, true)}
                            onDragOver={(e) => handleDragEvent(e, true)}
                            onDragLeave={(e) => handleDragEvent(e, false)}
                            onDrop={handleDrop}
                            className={`relative group flex-1 min-h-[300px] border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-white/20'}`}
                        >
                            {sourceImage ? (
                                <>
                                    <img src={sourceImage} alt="Source" className="max-w-full max-h-full object-contain rounded-md p-1" />
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-xl">
                                        <Button variant="ghost" onClick={handleAddFromFile}>Change Image</Button>
                                        <Button variant="warn" onClick={handleRemoveImage}>Remove</Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-400 p-4 flex flex-col items-center">
                                    <UploadIcon />
                                    <p className="font-bold text-lg text-gray-300">{isDragging ? 'Drop to Upload!' : 'Upload an Image'}</p>
                                    <p className="text-sm">Drag & drop, paste, or browse your files.</p>
                                    <div className="flex items-center gap-3 mt-4">
                                        <Button variant="ghost" onClick={handleAddFromFile}>Browse</Button>
                                        <Button variant="ghost" onClick={handlePaste}>Paste</Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-200 mb-2">2. Edit Instruction</h3>
                            <TextArea
                                placeholder="e.g., Change the date to 'Dec 25, 2024'"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="h-28"
                                disabled={!sourceImage || isLoading}
                            />
                        </div>

                        <div className="mt-auto flex-shrink-0">
                            <Button 
                                onClick={handleGenerate} 
                                disabled={isLoading || !sourceImage || !prompt.trim()}
                                className="w-full text-base py-3"
                            >
                                {isLoading ? <><Spinner className="mr-2" /> Generating...</> : '✨ Generate Edit'}
                            </Button>
                        </div>
                    </div>

                    {/* ===== OUTPUT COLUMN ===== */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
                        <div className="relative group w-full h-full rounded-lg bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#2a2a44_0%_50%)] bg-[0_0/20px_20px] flex items-center justify-center overflow-hidden">
                           {isLoading ? (
                               <div className="text-center text-gray-300 flex flex-col items-center animate-fade-in">
                                   <Spinner className="w-10 h-10" />
                                   <p className="mt-4 text-lg font-semibold">The AI is working its magic...</p>
                                   <p className="text-sm text-gray-400">This may take a moment.</p>
                               </div>
                           ) : outputImage ? (
                                <>
                                    <img src={outputImage} alt="Output" className="max-w-full max-h-full object-contain rounded-md animate-fade-in" />
                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="primary" onClick={handleDownloadOutput}>Download</Button>
                                    </div>
                                </>
                           ) : (
                                <div className="text-center text-gray-400 flex flex-col items-center">
                                    <MagicWandIcon />
                                    <p className="font-bold text-lg text-gray-300">Edited Image</p>
                                    <p className="text-sm">Your result will appear here.</p>
                                </div>
                           )}
                        </div>
                    </div>
                </main>
            </div>
            <style>
                {`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                `}
            </style>
        </div>
    );
};

export default ImageEditor;
