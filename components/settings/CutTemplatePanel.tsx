import React, { useState } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { CutTemplate } from '../../types';
import Button from '../common/Button';
import { fileToBase64, readImagesFromClipboard, uploadDataUrlToStorage } from '../../utils/fileUtils';

const CutTemplatePanel: React.FC = () => {
    const { templates, addTemplate, deleteTemplate, updateTemplate } = useTemplates<CutTemplate>('DIECUT_TEMPLATES');
    const [name, setName] = useState('');

    const handleAdd = async (newName: string, data: { svgText?: string; pngMask?: string }) => {
        if (!newName.trim()) {
            alert('Template name is required.');
            return;
        }
        await addTemplate({ name: newName.trim(), ...data } as any);
        setName('');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const baseName = name || file.name.replace(/\.[^/.]+$/, "");
        if (file.type === "image/svg+xml" || file.name.endsWith('.svg')) {
            const svgText = await file.text();
            await handleAdd(baseName, { svgText });
        } else if (file.type === "image/png") {
            const pngMaskBase64 = await fileToBase64(file);
            const storagePath = `DIECUT_TEMPLATES/${baseName.replace(/\s/g, '_')}-${Date.now()}.png`;
            const { downloadUrl: pngMask } = await uploadDataUrlToStorage(pngMaskBase64, storagePath);
            await handleAdd(baseName, { pngMask });
        } else {
            alert('Unsupported file type. Please use SVG or PNG.');
        }
        e.target.value = ''; // Reset file input
    };
    
    const handlePaste = async () => {
        const baseName = name || 'Pasted Template';
        try {
            const text = await navigator.clipboard.readText();
            if (text && /<svg[\s\S]*<\/svg>/i.test(text)) {
                await handleAdd(baseName, { svgText: text });
                return;
            }
        } catch {}

        try {
            const images = await readImagesFromClipboard();
            if (images.length > 0) {
                const storagePath = `DIECUT_TEMPLATES/${baseName.replace(/\s/g, '_')}-${Date.now()}.png`;
                const { downloadUrl: pngMask } = await uploadDataUrlToStorage(images[0], storagePath);
                await handleAdd(baseName, { pngMask });
                return;
            }
        } catch {}
        alert('No SVG or image found on clipboard.');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure?')) deleteTemplate(id);
    };
    
    const handleRename = (template: CutTemplate) => {
        const newName = prompt('Enter new name:', template.name);
        if (newName) updateTemplate(template.id, { name: newName });
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Cut Templates (SVG/PNG)</h3>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                 <h4 className="font-bold mb-2">Add New Template</h4>
                 <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-grow">
                        <label className="text-sm text-gray-400 mb-1 block">Template Name</label>
                        <input
                            type="text"
                            placeholder="e.g., 'Keychain Outline'"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none"
                        />
                    </div>
                    <Button variant="ghost" onClick={handlePaste}>Paste</Button>
                    <Button variant="ghost" onClick={() => document.getElementById('cut-file-input')?.click()}>
                        Choose File
                    </Button>
                    <input type="file" id="cut-file-input" accept=".svg,image/png" className="hidden" onChange={handleFileChange} />
                 </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="font-bold mb-2">Saved Templates ({templates.length})</h4>
                 <div className="max-h-[45vh] overflow-y-auto pr-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(t => (
                            <div key={t.id} className="bg-black/20 p-2 rounded-lg flex flex-col">
                                <div className="w-full h-32 bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#2a2a44_0%_50%)] bg-[0_0/10px_10px] rounded-md mb-2 flex items-center justify-center p-2">
                                    <img src={t.svgText ? `data:image/svg+xml;base64,${btoa(t.svgText)}` : t.pngMask} alt={t.name} className="max-w-full max-h-full object-contain"/>
                                </div>
                                <p className="font-semibold text-sm truncate" title={t.name}>{t.name}</p>
                                <span className="text-xs text-gray-400">{t.svgText ? 'SVG' : 'PNG Mask'}</span>
                                <div className="flex gap-2 mt-auto pt-2">
                                    <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={() => handleRename(t)}>Rename</Button>
                                    <Button variant="warn" className="!text-xs !px-2 !py-1" onClick={() => handleDelete(t.id)}>Delete</Button>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && <p className="text-gray-500 text-center py-4 col-span-full">No cut templates saved.</p>}
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default CutTemplatePanel;