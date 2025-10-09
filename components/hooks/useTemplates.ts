import { useState, useEffect, useCallback } from 'react';

type BaseTemplate = { id: string; createdAt: number; };

// --- IndexedDB Helper ---
const DB_NAME = 'AIStudioTemplateDB';
const DB_VERSION = 1;
const IMAGE_STORES = ['SAMPLE_TEMPLATES', 'ARTREF_TEMPLATES', 'DIECUT_TEMPLATES'];

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => {
                console.error("IndexedDB error:", request.error);
                reject("Error opening IndexedDB");
            };
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                IMAGE_STORES.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
                    }
                });
            };
        });
    }
    return dbPromise;
};

const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onerror = () => reject(`Error fetching from ${storeName}`);
        request.onsuccess = () => resolve(request.result);
    });
};

const dbPut = async <T>(storeName: string, item: T): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);
        request.onerror = () => reject(`Error writing to ${storeName}`);
        request.onsuccess = () => resolve();
    });
};

const dbDelete = async (storeName: string, id: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onerror = () => reject(`Error deleting from ${storeName}`);
        request.onsuccess = () => resolve();
    });
};

// Event to notify other hooks of changes
const TEMPLATE_UPDATED_EVENT = 'template-store-updated';

export function useTemplates<T extends BaseTemplate>(storageKey: string) {
    const [templates, setTemplates] = useState<T[]>([]);
    const isImageStore = IMAGE_STORES.includes(storageKey);

    const loadTemplates = useCallback(async () => {
        try {
            let items: T[];
            if (isImageStore) {
                items = await dbGetAll<T>(storageKey);
            } else {
                const stored = localStorage.getItem(storageKey);
                items = stored ? JSON.parse(stored) : [];
            }
            setTemplates(Array.isArray(items) ? items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : []);
        } catch (error) {
            console.error(`Error reading ${storageKey}`, error);
            setTemplates([]);
        }
    }, [storageKey, isImageStore]);

    useEffect(() => {
        loadTemplates();

        const handleUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.storageKey === storageKey) {
                loadTemplates();
            }
        };

        window.addEventListener(TEMPLATE_UPDATED_EVENT, handleUpdate);
        return () => {
            window.removeEventListener(TEMPLATE_UPDATED_EVENT, handleUpdate);
        };
    }, [loadTemplates, storageKey]);

    const dispatchUpdate = () => {
        window.dispatchEvent(new CustomEvent(TEMPLATE_UPDATED_EVENT, { detail: { storageKey } }));
    };

    const addTemplate = useCallback(async (newItemData: Omit<T, 'id' | 'createdAt'>): Promise<T> => {
        const newItem = {
            ...newItemData,
            id: `${storageKey}-${Date.now()}`,
            createdAt: Date.now()
        } as T;

        if (isImageStore) {
            await dbPut(storageKey, newItem);
        } else {
            const currentTemplates = JSON.parse(localStorage.getItem(storageKey) || '[]');
            localStorage.setItem(storageKey, JSON.stringify([newItem, ...currentTemplates]));
        }
        dispatchUpdate();
        return newItem;
    }, [storageKey, isImageStore]);

    const updateTemplate = useCallback(async (id: string, updates: Partial<T>) => {
        let updatedItem: T | undefined;
        // Use a functional update for `setTemplates` to ensure we have the latest state
        setTemplates(currentTemplates => {
            const newTemplates = currentTemplates.map(t => {
                if (t.id === id) {
                    updatedItem = { ...t, ...updates };
                    return updatedItem;
                }
                return t;
            });

            if (updatedItem) {
                if (isImageStore) {
                    dbPut(storageKey, updatedItem);
                } else {
                    localStorage.setItem(storageKey, JSON.stringify(newTemplates));
                }
            }
            return newTemplates;
        });
    }, [storageKey, isImageStore]);

    const deleteTemplate = useCallback(async (id: string) => {
        if (isImageStore) {
            await dbDelete(storageKey, id);
        } else {
            const currentTemplates = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newTemplates = currentTemplates.filter((t: T) => t.id !== id);
            localStorage.setItem(storageKey, JSON.stringify(newTemplates));
        }
        dispatchUpdate();
    }, [storageKey, isImageStore]);

    return { templates, addTemplate, updateTemplate, deleteTemplate };
}
