import { useState, useEffect, useCallback } from 'react';
import { ApiKey, User } from '../types';
import { db } from '../services/firebase';
import {
    collection,
    query,
    orderBy,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'api_keys';

export function useApiKeys(user: User | null) {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

    const loadApiKeys = useCallback(async () => {
        if (!user) {
            setApiKeys([]);
            return;
        }
        try {
            if (user.role === 'admin') {
                const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
                const querySnapshot = await getDocs(q);
                const items = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ApiKey));
                setApiKeys(items);
            } else if (user.apiKeyId) {
                const docRef = doc(db, COLLECTION_NAME, user.apiKeyId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setApiKeys([{ ...docSnap.data(), id: docSnap.id } as ApiKey]);
                } else {
                    console.warn(`API key with ID ${user.apiKeyId} not found.`);
                    setApiKeys([]);
                }
            } else {
                setApiKeys([]);
            }
        } catch (error) {
            console.error(`Error reading from collection ${COLLECTION_NAME}:`, error);
            setApiKeys([]);
        }
    }, [user]);

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