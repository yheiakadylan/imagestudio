import React, { useState, useContext } from 'react';
import Button from '../common/Button';
import { GoogleGenAI } from '@google/genai';
import { useApiKeys } from '../../hooks/useApiKeys';
import { ApiKey } from '../../types';
import { AuthContext } from '../../contexts/AuthContext';

const ApiKeyPanel: React.FC = () => {
    // FIX: The useApiKeys hook requires the user object. Get it from AuthContext.
    const auth = useContext(AuthContext);
    const { apiKeys, addApiKey, deleteApiKey, updateApiKey } = useApiKeys(auth.user);
    const [newName, setNewName] = useState('');
    const [newKey, setNewKey] = useState('');
    const [testResults, setTestResults] = useState<Record<string, { message: string, type: 'info' | 'ok' | 'err' }>>({});

    const handleAddKey = () => {
        if (!newName.trim() || !newKey.trim()) {
            alert('Name and API Key are required.');
            return;
        }
        addApiKey({ name: newName, key: newKey });
        setNewName('');
        setNewKey('');
    };

    const handleTest = async (key: ApiKey) => {
        setTestResults(prev => ({ ...prev, [key.id]: { message: 'Testing...', type: 'info' } }));
        try {
            const ai = new GoogleGenAI({ apiKey: key.key });
            await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
            setTestResults(prev => ({ ...prev, [key.id]: { message: 'OK', type: 'ok' } }));
        } catch (error: any) {
            setTestResults(prev => ({ ...prev, [key.id]: { message: 'Failed', type: 'err' } }));
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Manage Google AI API Keys</h3>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <h4 className="font-bold mb-2">Add New API Key</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="Key Name (e.g., 'Primary')" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none" />
                    <input type="password" placeholder="API Key (starts with 'AIza...')" value={newKey} onChange={e => setNewKey(e.target.value)} className="w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none" />
                    <Button onClick={handleAddKey}>Add Key</Button>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="font-bold mb-2">Saved Keys ({apiKeys.length})</h4>
                <div className="space-y-2">
                    {apiKeys.map(key => {
                        const testStatus = testResults[key.id] || { message: 'Untested', type: 'info' };
                        const statusColor = { info: 'text-gray-400', ok: 'text-green-400', err: 'text-red-400' }[testStatus.type];
                        return (
                            <div key={key.id} className="bg-black/20 p-3 rounded-lg flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold">{key.name}</p>
                                    <p className="text-xs text-gray-400 font-mono">...{key.key.slice(-4)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-semibold w-20 text-center ${statusColor}`}>{testStatus.message}</span>
                                    <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={() => handleTest(key)}>Test</Button>
                                    <Button variant="warn" className="!text-xs !px-2 !py-1" onClick={() => deleteApiKey(key.id)}>Delete</Button>
                                </div>
                            </div>
                        )
                    })}
                     {apiKeys.length === 0 && <p className="text-gray-500 text-center py-4">No API keys saved.</p>}
                </div>
            </div>
        </div>
    );
};

export default ApiKeyPanel;
