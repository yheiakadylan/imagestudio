import { useState, useEffect, useCallback } from 'react';
import { ApiKey } from '../types';

const STORAGE_KEY = 'API_KEY_LIST';

export function useApiKeys() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

    useEffect(() => {
        try {
            const item = localStorage.getItem(STORAGE_KEY);
            const parsedItems = item ? JSON.parse(item) : [];
            setApiKeys(Array.isArray(parsedItems) ? parsedItems : []);
        } catch (error) {
            console.error(`Error reading ${STORAGE_KEY} from localStorage`, error);
            setApiKeys([]);
        }
    }, []);
    
    const saveApiKeys = useCallback((newKeys: ApiKey[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
            setApiKeys(newKeys);
        } catch (error) {
            console.error(`Error saving ${STORAGE_KEY} to localStorage`, error);
        }
    }, []);

    const addApiKey = useCallback((newKeyData: Omit<ApiKey, 'id'>) => {
        const newKey = {
            ...newKeyData,
            id: `${STORAGE_KEY}-${Date.now()}`,
        };
        saveApiKeys([...apiKeys, newKey]);
        return newKey;
    }, [apiKeys, saveApiKeys]);
    
    const updateApiKey = useCallback((id: string, updates: Partial<ApiKey>) => {
        const newKeys = apiKeys.map(k => k.id === id ? { ...k, ...updates } : k);
        saveApiKeys(newKeys);
    }, [apiKeys, saveApiKeys]);

    const deleteApiKey = useCallback((id: string) => {
        if (window.confirm('Are you sure you want to delete this API key?')) {
            const newKeys = apiKeys.filter(k => k.id !== id);
            saveApiKeys(newKeys);
        }
    }, [apiKeys, saveApiKeys]);

    return { apiKeys, addApiKey, updateApiKey, deleteApiKey };
}