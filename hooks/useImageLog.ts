import { useState, useEffect, useCallback } from 'react';
import { LogEntry, User } from '../types';
import { db, storage } from '../services/firebase';
import {
    collection,
    query,
    orderBy,
    getDocs,
    Timestamp,
    doc,
    setDoc,
    writeBatch,
    where,
} from 'firebase/firestore';
import { uploadDataUrlToStorage } from '../utils/fileUtils';


const COLLECTION_NAME = 'generation_log';

export function useImageLog(user: User | null) {
    const [log, setLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        async function loadLog() {
            if (!user) {
                setLog([]);
                return;
            }
            try {
                let q;
                if (user.role === 'admin') {
                    q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
                } else {
                    q = query(
                        collection(db, COLLECTION_NAME),
                        where('ownerUid', '==', user.id),
                        orderBy('createdAt', 'desc')
                    );
                }

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
    }, [user]);

    const addResultToLog = useCallback(async (result: Omit<LogEntry, 'ownerUid' | 'deleteUrl'>) => {
        if (!user) {
            console.error("Cannot add log entry without a logged-in user.");
            return;
        }

        try {
            const storagePath = `generation_log/${result.id}.png`;
            // uploadDataUrlToStorage giờ trả về một object
            const { downloadUrl, deleteUrl } = await uploadDataUrlToStorage(result.dataUrl, storagePath);

            const resultForFirestore: LogEntry = {
                ...result,
                dataUrl: downloadUrl,
                deleteUrl: deleteUrl, // <-- Lưu URL xóa
                ownerUid: user.id
            };

            await setDoc(doc(db, COLLECTION_NAME, result.id), resultForFirestore);
            setLog(prevLog => [resultForFirestore, ...prevLog].sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Failed to add item to Firestore log", error);
        }
    }, [user]);

    const deleteResultsFromLog = useCallback(async (idsToDelete: string[]) => {
        if (idsToDelete.length === 0) return;

        const entriesToDelete = log.filter(entry => idsToDelete.includes(entry.id));

        try {
            const batch = writeBatch(db);
            idsToDelete.forEach(id => {
                const docRef = doc(db, COLLECTION_NAME, id);
                batch.delete(docRef);
            });
            await batch.commit();

            // Xóa ảnh từ ImgBB
            const deletePromises = entriesToDelete.map(entry => {
                if (entry.deleteUrl) {
                    // ImgBB yêu cầu gửi request tới delete_url, nhưng nó có thể bị chặn bởi CORS
                    // từ phía client. Một giải pháp tốt hơn là tạo một proxy server nhỏ.
                    // Tuy nhiên, để đơn giản, chúng ta thử fetch trực tiếp.
                    return fetch(entry.deleteUrl, { method: 'POST' }).catch(e => console.error("Could not delete from ImgBB:", e));
                }
                return Promise.resolve();
            });

            await Promise.allSettled(deletePromises);

            setLog(prevLog => prevLog.filter(result => !idsToDelete.includes(result.id)));
        } catch (error) {
            console.error("Failed to delete items from Firestore log:", error);
        }
    }, [log]);

    return { log, addResultToLog, deleteResultsFromLog };
}