import React, { useState } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { ArtRef, Sample } from '../../types';
import Button from '../common/Button';
import { fileToBase64, readImagesFromClipboard, uploadDataUrlToStorage, deleteFromCloudinary, downloadJson, readJsonFromFile } from '../../utils/fileUtils';

type ImageTemplate = ArtRef | Sample;

interface ImageTemplatePanelProps<T extends ImageTemplate> {
    storageKey: 'SAMPLE_TEMPLATES' | 'ARTREF_TEMPLATES';
    title: string;
}

const ImageTemplatePanel = <T extends ImageTemplate>({ storageKey, title }: ImageTemplatePanelProps<T>) => {
    const { templates, addTemplate, deleteTemplate, updateTemplate } = useTemplates<T>(storageKey);
    const [name, setName] = useState('');

    const handleAdd = async (dataUrls: string[], baseName: string) => {
        if (!baseName) {
            alert('Please provide a name for the template(s).');
            return;
        }
        for (let i = 0; i < dataUrls.length; i++) {
            const dataUrl = dataUrls[i];
            const storagePath = `${storageKey}/${baseName.replace(/\s/g, '_')}-${Date.now()}-${i}.png`;
            const { downloadUrl, publicId } = await uploadDataUrlToStorage(dataUrl, storagePath);
            const templateName = dataUrls.length > 1 ? `${baseName} ${i + 1}` : baseName;
            await addTemplate({ name: templateName, dataUrl: downloadUrl, publicId } as any);
        }
        setName('');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const dataUrls = await Promise.all(Array.from(files).map(fileToBase64));
        await handleAdd(dataUrls, name || files[0].name.replace(/\.[^/.]+$/, ""));
    };

    const handlePaste = async () => {
        try {
            const dataUrls = await readImagesFromClipboard();
            if(dataUrls.length > 0) {
                await handleAdd(dataUrls, name || 'Pasted Image');
            } else {
                alert('No image found on clipboard.');
            }
        } catch (error: any) {
            alert(error.message);
        }
    };
    
    const handleDelete = async (template: T) => {
        if (window.confirm('Are you sure you want to delete this item? This will also delete the image from storage.')) {
            try {
                if (template.publicId) {
                    await deleteFromCloudinary(template.publicId);
                }
                await deleteTemplate(template.id);
            } catch (error: any) {
                alert(`Failed to delete template: ${error.message}`);
            }
        }
    };
    
    const handleRename = (template: T) => {
        const newName = prompt('Enter new name:', template.name);
        if (newName && newName.trim()) {
            updateTemplate(template.id, { name: newName.trim() } as Partial<T>);
        }
    };

    const handleExport = () => {
        if (templates.length === 0) {
            alert('No templates to export.');
            return;
        }
        const exportData = templates.map(({ id, createdAt, ...rest }) => rest);
        const filename = `${storageKey.toLowerCase().replace('_', '-')}.json`;
        downloadJson(exportData, filename);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const importedData = await readJsonFromFile<Omit<T, 'id' | 'createdAt'>[]>(file);
            if (!Array.isArray(importedData)) {
                throw new Error('Invalid format: JSON file should contain an array.');
            }
            
            if (window.confirm(`This will import ${importedData.length} new template(s). Continue?`)) {
                for (const item of importedData) {
                    if (item.name && item.dataUrl) {
                        await addTemplate(item as any);
                    } else {
                        console.warn('Skipping invalid item during import:', item);
                    }
                }
                alert('Import successful!');
            }
        } catch (error: any) {
            alert(`Import failed: ${error.message}`);
        } finally {
            e.target.value = '';
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                 <h4 className="font-bold mb-2">Add New</h4>
                 <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-grow">
                        <label className="text-sm text-gray-400 mb-1 block">Template Name</label>
                        <input
                            type="text"
                            placeholder="e.g., 'T-Shirt Front' or 'Floral Pattern'"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none"
                        />
                    </div>
                    <Button variant="ghost" onClick={handlePaste}>Paste from Clipboard</Button>
                    <Button variant="ghost" onClick={() => document.getElementById(`${storageKey}-file-input`)?.click()}>
                        Choose File(s)
                    </Button>
                    <input type="file" id={`${storageKey}-file-input`} multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                 </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold">Saved Items ({templates.length})</h4>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={() => document.getElementById(`${storageKey}-import-input`)?.click()}>Import</Button>
                        <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={handleExport}>Export All</Button>
                        <input type="file" id={`${storageKey}-import-input`} accept=".json" className="hidden" onChange={handleImport} />
                    </div>
                </div>
                 <div className="max-h-[45vh] overflow-y-auto pr-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(template => (
                            <div key={template.id} className="bg-black/20 p-2 rounded-lg flex flex-col">
                                <img src={template.dataUrl} alt={template.name} className="w-full h-32 object-cover rounded-md mb-2"/>
                                <p className="font-semibold text-sm truncate" title={template.name}>{template.name}</p>
                                <div className="flex gap-2 mt-auto pt-2">
                                    <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={() => handleRename(template)}>Rename</Button>
                                    <Button variant="warn" className="!text-xs !px-2 !py-1" onClick={() => handleDelete(template)}>Delete</Button>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && <p className="text-gray-500 text-center py-4 col-span-full">No items saved.</p>}
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default ImageTemplatePanel;
