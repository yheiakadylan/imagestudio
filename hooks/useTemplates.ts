import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import {
    collection,
    query,
    orderBy,
    getDocs,
    Timestamp,
    addDoc,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';


type BaseTemplate = { id: string; createdAt: number; };

export function useTemplates<T extends BaseTemplate>(collectionName: string) {
    const [templates, setTemplates] = useState<T[]>([]);

    const loadTemplates = useCallback(async () => {
        try {
            const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const items = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Firestore returns createdAt as a Timestamp object, convert it to milliseconds
                const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt;
                return { ...data, id: doc.id, createdAt } as T;
            });
            setTemplates(items);
        } catch (error) {
            console.error(`Error reading from collection ${collectionName}:`, error);
            setTemplates([]);
        }
    }, [collectionName]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const addTemplate = useCallback(async (newItemData: Omit<T, 'id' | 'createdAt'>): Promise<T> => {
        try {
            const newItemWithTimestamp = {
                ...newItemData,
                createdAt: Date.now() // Use number (milliseconds) for consistency
            };
            const docRef = await addDoc(collection(db, collectionName), newItemWithTimestamp);
            
            const newItem = {
                ...newItemData,
                id: docRef.id,
                createdAt: newItemWithTimestamp.createdAt
            } as T;
            
            // Optimistic update in state
            setTemplates(prev => [newItem, ...prev].sort((a, b) => b.createdAt - a.createdAt));

            return newItem;
        } catch (error) {
            console.error(`Error adding to collection ${collectionName}:`, error);
            throw error;
        }
    }, [collectionName]);

    const updateTemplate = useCallback(async (id: string, updates: Partial<Omit<T, 'id'>>) => {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, updates);
            // Optimistic update in state
            setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        } catch (error) {
            console.error(`Error updating document in ${collectionName}:`, error);
            throw error;
        }
    }, [collectionName]);

    const deleteTemplate = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, collectionName, id));
            // Optimistic update in state
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error(`Error deleting from collection ${collectionName}:`, error);
            throw error;
        }
    }, [collectionName]);

    return { templates, addTemplate, updateTemplate, deleteTemplate };
}