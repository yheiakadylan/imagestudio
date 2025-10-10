import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '../types';
import { db } from '../services/firebase';
import firebase from 'firebase/app';
import 'firebase/firestore';


const COLLECTION_NAME = 'generation_log';

export function useImageLog() {
    const [log, setLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        async function loadLog() {
            try {
                // FIX: Use Firebase v8 syntax
                const q = db.collection(COLLECTION_NAME).orderBy('createdAt', 'desc');
                // FIX: Use Firebase v8 syntax
                const querySnapshot = await q.get();
                const storedLog = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Convert Firestore Timestamp to milliseconds for consistency
                    // FIX: Use Firebase v8 Timestamp type
                    const createdAt = data.createdAt instanceof firebase.firestore.Timestamp 
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
            // Use set with a specific ID to preserve the client-generated ID
            // FIX: Use Firebase v8 syntax
            await db.collection(COLLECTION_NAME).doc(result.id).set(result);
            // Optimistically update the local state and re-sort
            setLog(prevLog => [result, ...prevLog].sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Failed to add item to Firestore log", error);
        }
    }, []);

    const deleteResultsFromLog = useCallback(async (idsToDelete: string[]) => {
        if (idsToDelete.length === 0) return;
        try {
            // Use a batch write for efficient and atomic deletion
            // FIX: Use Firebase v8 syntax
            const batch = db.batch();
            idsToDelete.forEach(id => {
                // FIX: Use Firebase v8 syntax
                const docRef = db.collection(COLLECTION_NAME).doc(id);
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
