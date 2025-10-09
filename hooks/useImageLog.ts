import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '../types';

// --- IndexedDB Helper for Image Log ---
const DB_NAME = 'AIStudioImageLogDB';
const DB_VERSION = 1;
const STORE_NAME = 'generation_log';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => {
                console.error("IndexedDB error:", request.error);
                reject("Error opening Image Log DB");
            };
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }
    return dbPromise;
};

const dbGetAll = async <T>(): Promise<T[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onerror = () => reject(`Error fetching all from ${STORE_NAME}`);
        request.onsuccess = () => resolve(request.result);
    });
};

const dbPut = async <T>(item: T): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);
        request.onerror = () => reject(`Error writing to ${STORE_NAME}`);
        request.onsuccess = () => resolve();
    });
};

const dbDelete = async (ids: string[]): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        if (ids.length === 0) {
            return resolve();
        }
        
        ids.forEach(id => {
            store.delete(id);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(`Error on delete transaction for ${STORE_NAME}`);
    });
};
// --- End IndexedDB Helper ---

export function useImageLog() {
    const [log, setLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        async function loadLog() {
            try {
                const storedLog = await dbGetAll<LogEntry>();
                setLog(storedLog.sort((a, b) => b.createdAt - a.createdAt));
            } catch (e) {
                console.error("Failed to load image log from IndexedDB", e);
                setLog([]);
            }
        }
        loadLog();
    }, []);

    const addResultToLog = useCallback(async (result: LogEntry) => {
        try {
            await dbPut<LogEntry>(result);
            setLog(prevLog => [result, ...prevLog]);
        } catch (error) {
            console.error("Failed to add item to IndexedDB log", error);
        }
    }, []);

    const deleteResultsFromLog = useCallback(async (idsToDelete: string[]) => {
        try {
            await dbDelete(idsToDelete);
            setLog(prevLog => prevLog.filter(result => !idsToDelete.includes(result.id)));
        } catch(error) {
            console.error("Failed to delete items from IndexedDB log", error);
        }
    }, []);
    
    return { log, addResultToLog, deleteResultsFromLog };
}