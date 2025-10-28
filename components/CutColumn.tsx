import React, { useEffect, useRef } from 'react';
import { CutTemplate, User } from '../types';
import Button from './common/Button';
import Select from './common/Select';
import { useTemplates } from '../hooks/useTemplates';
import { renderCutPreviewOnCanvas } from '../utils/canvasUtils';
import { readImagesFromClipboard, fileToBase64, uploadDataUrlToStorage } from '../utils/fileUtils';

interface CutColumnProps {
    artwork: string | null;
    template: CutTemplate | null;
    onTemplateChange: (template: CutTemplate | null) => void;
    user: User;
}

const CutColumn: React.FC<CutColumnProps> = ({ artwork, template, onTemplateChange, user }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { templates: cutTemplates, addTemplate } = useTemplates<CutTemplate>('DIECUT_TEMPLATES');
    
    useEffect(() => {
        if (canvasRef.current && artwork && template) {
            renderCutPreviewOnCanvas(canvasRef.current, artwork, template);
        } else if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, [artwork, template]);

    const handleTemplateSelect = (id: string) => {
        const selected = cutTemplates.find(t => t.id === id) || null;
        onTemplateChange(selected);
    };
    
    const handlePersonalAdd = (data: Partial<Omit<CutTemplate, 'id' | 'createdAt'>>) => {
        const tempTemplate: CutTemplate = {
            id: `temp-${Date.now()}`,
            name: data.name || 'Personal Template',
            createdAt: Date.now(),
            ...data
        };
        onTemplateChange(tempTemplate);
    };

    const handleFileAdd = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.svg, image/png';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const isPrivilegedUser = user.role === 'admin' || user.role === 'manager';
            let newTemplateData: Partial<CutTemplate> = { name: file.name };

            if (file.type === "image/svg+xml" || file.name.endsWith('.svg')) {
                newTemplateData.svgText = await file.text();
            } else if (file.type === "image/png") {
                const pngMaskBase64 = await fileToBase64(file);
                if (isPrivilegedUser) {
                    // Upload to Cloudinary for privileged users saving a template
                    const storagePath = `DIECUT_TEMPLATES/${file.name.replace(/\s/g, '_')}-${Date.now()}.png`;
                    const { downloadUrl } = await uploadDataUrlToStorage(pngMaskBase64, storagePath);
                    newTemplateData.pngMask = downloadUrl;
                } else {
                    // Use local base64 for personal (temporary) templates
                    newTemplateData.pngMask = pngMaskBase64;
                }
            }
            
            if (isPrivilegedUser) {
                 if (newTemplateData.svgText || newTemplateData.pngMask) {
                    const newTemplate = await addTemplate(newTemplateData as any);
                    onTemplateChange(newTemplate);
                 }
            } else {
                handlePersonalAdd(newTemplateData);
            }
        };
        input.click();
    };
    
    const handlePaste = async () => {
        const isPrivilegedUser = user.role === 'admin' || user.role === 'manager';
        
        try {
            const text = await navigator.clipboard.readText();
            if (text && /<svg[\s\S]*<\/svg>/i.test(text)) {
                 if (isPrivilegedUser) {
                    const newTemplate = await addTemplate({ name: 'Pasted SVG', svgText: text });
                    onTemplateChange(newTemplate);
                } else {
                    handlePersonalAdd({ name: 'Pasted SVG', svgText: text });
                }
                return;
            }
        } catch (e) {
            console.warn("Could not read text from clipboard, trying images...");
        }

        try {
            const images = await readImagesFromClipboard();
            if (images.length > 0) {
                 if (isPrivilegedUser) {
                    const storagePath = `DIECUT_TEMPLATES/pasted-${Date.now()}.png`;
                    const { downloadUrl } = await uploadDataUrlToStorage(images[0], storagePath);
                    const newTemplate = await addTemplate({ name: 'Pasted PNG Mask', pngMask: downloadUrl });
                    onTemplateChange(newTemplate);
                } else {
                    handlePersonalAdd({ name: 'Pasted PNG Mask', pngMask: images[0] });
                }
            }
        } catch (error) {
             alert('Clipboard has no SVG text or image.');
        }
    };


    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col min-h-0 backdrop-blur-lg h-full">
            <h2 className="text-lg font-bold mb-2">Cut Template</h2>
            <div className="flex gap-2 mb-2">
                <Select
                    value={template?.id || ''}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="flex-1"
                >
                    <option value="">— Select Template —</option>
                    {cutTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
                <Button variant="ghost" onClick={handleFileAdd}>Add</Button>
                <Button variant="ghost" onClick={handlePaste}>Paste</Button>
            </div>
            
            <div className="flex-1 min-h-0 border-2 border-dashed border-white/25 rounded-xl bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#2a2a44_0%_50%)] bg-[0_0/20px_20px] flex items-center justify-center p-2">
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain"></canvas>
            </div>
            <div className="text-center text-sm text-gray-400 mt-2">
                {artwork ? (template ? 'Artwork with template outline.' : 'Select a template to see preview.') : 'Apply an artwork to see preview.'}
            </div>
        </div>
    );
};

export default CutColumn;