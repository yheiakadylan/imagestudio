import { useState, useEffect, useCallback } from 'react';
import { ApiKey } from '../types';
import { db } from '../services/firebase';
import {
    collection,
    query,
    orderBy,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'api_keys';

export function useApiKeys() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

    const loadApiKeys = useCallback(async () => {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const items = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ApiKey));
            setApiKeys(items);
        } catch (error) {
            console.error(`Error reading from collection ${COLLECTION_NAME}:`, error);
            setApiKeys([]);
        }
    }, []);

    useEffect(() => {
        loadApiKeys();
    }, [loadApiKeys]);

    const addApiKey = useCallback(async (newKeyData: Omit<ApiKey, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), newKeyData);
            const newKey = { ...newKeyData, id: docRef.id };
            setApiKeys(prev => [...prev, newKey].sort((a, b) => a.name.localeCompare(b.name)));
            return newKey;
        } catch (error) {
            console.error(`Error adding to collection ${COLLECTION_NAME}:`, error);
            throw error;
        }
    }, []);

    const updateApiKey = useCallback(async (id: string, updates: Partial<Omit<ApiKey, 'id'>>) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, updates);
            setApiKeys(prev => prev.map(k => k.id === id ? { ...k, ...updates } : k).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error(`Error updating document in ${COLLECTION_NAME}:`, error);
            throw error;
        }
    }, []);

    const deleteApiKey = useCallback(async (id: string) => {
        if (window.confirm('Are you sure you want to delete this API key?')) {
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
                setApiKeys(prev => prev.filter(k => k.id !== id));
            } catch (error) {
                console.error(`Error deleting from collection ${COLLECTION_NAME}:`, error);
                throw error;
            }
        }
    }, []);

    return { apiKeys, addApiKey, updateApiKey, deleteApiKey };
}