import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '../types';
import { db } from '../services/firebase';
import {
    collection,
    query,
    orderBy,
    getDocs,
    Timestamp,
    doc,
    setDoc,
    writeBatch,
} from 'firebase/firestore';
import { uploadDataUrlToStorage } from '../utils/fileUtils';


const COLLECTION_NAME = 'generation_log';

export function useImageLog() {
    const [log, setLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        async function loadLog() {
            try {
                const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const storedLog = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Convert Firestore Timestamp to milliseconds for consistency
                    const createdAt = data.createdAt instanceof Timestamp 
                        ? data.createdAt.toMillis() 
                        : data.createdAt;
                    return { ...data, id: doc.id, createdAt } as LogEntry;
                });
                setLog(storedLog);
            } catch (e) {
                console.error("Failed to load image log from Firestore", e);
                setLog([]);
            }
        }
        loadLog();
    }, []);

    const addResultToLog = useCallback(async (result: LogEntry) => {
        try {
            // Upload full-resolution image to Firebase Storage instead of downscaling.
            const storagePath = `generation_log/${result.id}.png`;
            const downloadUrl = await uploadDataUrlToStorage(result.dataUrl, storagePath);

            // Prepare the log entry with the storage URL.
            const resultForFirestore = { ...result, dataUrl: downloadUrl };

            // Save the log entry with the URL to Firestore.
            await setDoc(doc(db, COLLECTION_NAME, result.id), resultForFirestore);
            
            // Optimistically update the local state with the new entry containing the URL.
            setLog(prevLog => [resultForFirestore, ...prevLog].sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Failed to add item to Firestore log", error);
        }
    }, []);

    const deleteResultsFromLog = useCallback(async (idsToDelete: string[]) => {
        if (idsToDelete.length === 0) return;
        try {
            // Use a batch write for efficient and atomic deletion
            const batch = writeBatch(db);
            idsToDelete.forEach(id => {
                const docRef = doc(db, COLLECTION_NAME, id);
                batch.delete(docRef);
            });
            await batch.commit();
            
            // Optimistically update local state
            setLog(prevLog => prevLog.filter(result => !idsToDelete.includes(result.id)));
        } catch(error) {
            console.error("Failed to delete items from Firestore log", error);
        }
    }, []);
    
    return { log, addResultToLog, deleteResultsFromLog };
}