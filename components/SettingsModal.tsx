import React, { useState, useContext, useMemo } from 'react';
import Button from './common/Button';
import UserManagementPanel from './UserManagementPanel';
import ApiKeyPanel from './settings/ApiKeyPanel';
import PromptTemplatePanel from './settings/PromptTemplatePanel';
import ImageTemplatePanel from './settings/ImageTemplatePanel';
import CutTemplatePanel from './settings/CutTemplatePanel';
import { ArtRef, CutTemplate, Sample, Template } from '../types';
import { AuthContext } from '../contexts/AuthContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'api' | 'prompts' | 'samples' | 'refs' | 'cuts' | 'users';

const ALL_TABS: { id: Tab, label: string, adminOnly: boolean }[] = [
    { id: 'api', label: 'API Keys', adminOnly: true },
    { id: 'users', label: 'User Management', adminOnly: true },
    { id: 'prompts', label: 'Mockup Prompts', adminOnly: false },
    { id: 'samples', label: 'Product Samples', adminOnly: false },
    { id: 'refs', label: 'Art References', adminOnly: false },
    { id: 'cuts', label: 'Cut Templates', adminOnly: false },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const auth = useContext(AuthContext);

    const availableTabs = useMemo(() => {
        if (auth.user?.role === 'admin') return ALL_TABS;
        if (auth.user?.role === 'manager') return ALL_TABS.filter(t => !t.adminOnly);
        return [];
    }, [auth.user?.role]);
    
    const [activeTab, setActiveTab] = useState<Tab>(availableTabs[0]?.id || 'api');

    // Effect to reset tab if it becomes unavailable
    React.useEffect(() => {
        if (isOpen && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0]?.id);
        }
    }, [isOpen, availableTabs, activeTab]);

    if (!isOpen) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'api': return auth.user?.role === 'admin' ? <ApiKeyPanel /> : null;
            case 'users': return auth.user?.role === 'admin' ? <UserManagementPanel /> : null;
            case 'prompts': return <PromptTemplatePanel />;
            case 'samples': return <ImageTemplatePanel<Sample> storageKey="SAMPLE_TEMPLATES" title="Product Samples" />;
            case 'refs': return <ImageTemplatePanel<ArtRef> storageKey="ARTREF_TEMPLATES" title="Artwork References" />;
            case 'cuts': return <CutTemplatePanel />;
            default: return null;
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/80 border border-white/20 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-2xl font-bold">Settings</h2>
                    <Button variant="ghost" onClick={onClose} className="!px-3 !py-1">✕</Button>
                </header>

                <div className="flex-1 flex min-h-0">
                    <aside className="w-1/4 p-4 border-r border-white/10 flex flex-col gap-2">
                        {availableTabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                                    activeTab === tab.id ? 'bg-blue-500/30 text-white' : 'hover:bg-white/10 text-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </aside>
                    <main className="w-3/4 overflow-y-auto p-6">
                        {renderContent()}
                    </main>
                </div>
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

export default SettingsModal;