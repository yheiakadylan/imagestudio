import React, { useState } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { Template } from '../../types';
import Button from '../common/Button';
import TextArea from '../common/TextArea';
import { downloadJson, readJsonFromFile } from '../../utils/fileUtils';

const PromptTemplatePanel: React.FC = () => {
    const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates<Template>('TEMPLATES');
    const [editing, setEditing] = useState<Partial<Template>>({});
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('');

    const handleSelectForEdit = (template: Template) => {
        setEditing(template);
        setName(template.name);
        setPrompt(template.prompt);
    };

    const handleClear = () => {
        setEditing({});
        setName('');
        setPrompt('');
    };

    const handleSave = async () => {
        if (!name || !prompt) {
            alert('Name and prompt are required.');
            return;
        }
        if (editing.id) {
            await updateTemplate(editing.id, { name, prompt });
        } else {
            await addTemplate({ name, prompt });
        }
        handleClear();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            deleteTemplate(id);
            if(editing.id === id) handleClear();
        }
    }

    const handleExport = () => {
        if (templates.length === 0) {
            alert('No templates to export.');
            return;
        }
        const exportData = templates.map(({ id, createdAt, ...rest }) => rest);
        downloadJson(exportData, 'mockup-prompts.json');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const importedData = await readJsonFromFile<Omit<Template, 'id' | 'createdAt'>[]>(file);
            if (!Array.isArray(importedData)) {
                throw new Error('Invalid format: JSON file should contain an array.');
            }
            
            if (window.confirm(`This will import ${importedData.length} new prompt template(s). Continue?`)) {
                for (const item of importedData) {
                    if (item.name && item.prompt) {
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
            <h3 className="text-xl font-bold text-white mb-4">Mockup Prompt Templates</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4" style={{maxHeight:400 }}>
                    <h4 className="font-bold">{editing.id ? 'Edit Template' : 'Add New Template'}</h4>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Template Prompt</label>
                        <TextArea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="h-40"
                            placeholder="One prompt per line..."
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <Button onClick={handleSave}>{editing.id ? 'Update' : 'Save'}</Button>
                        {editing.id && <Button variant="ghost" onClick={handleClear}>Cancel</Button>}
                    </div>
                </div>

                {/* List */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">Saved Templates ({templates.length})</h4>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={() => document.getElementById('prompt-template-import-input')?.click()}>Import</Button>
                            <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={handleExport}>Export All</Button>
                            <input type="file" id="prompt-template-import-input" accept=".json" className="hidden" onChange={handleImport} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                        {templates.map(template => (
                            <div key={template.id} className="bg-black/20 p-3 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{template.name}</p>
                                        <p className="text-xs text-gray-400 truncate max-w-xs">{template.prompt.split('\n')[0]}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={() => handleSelectForEdit(template)}>Edit</Button>
                                        <Button variant="warn" className="!text-xs !px-2 !py-1" onClick={() => handleDelete(template.id)}>Delete</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {templates.length === 0 && <p className="text-gray-500 text-center py-4">No templates saved.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptTemplatePanel;