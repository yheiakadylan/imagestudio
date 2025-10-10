import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, auth } from '../services/firebase';

export interface User {
    id: string;
    username: string;
    role: 'admin' | 'user' | 'manager';
    apiKeyId?: string;
    password?: string; // Only used for creation/validation, not stored in active session
}

interface AuthContextType {
    user: Omit<User, 'password'> | null;
    users: Omit<User, 'password'>[];
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    addUser: (newUser: Omit<User, 'id'>) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    users: [],
    isLoading: true,
    login: async () => {},
    logout: async () => {},
    addUser: async () => {},
    updateUser: async () => {},
    deleteUser: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadAllUsers = useCallback(async () => {
        try {
            // FIX: Use Firebase v8 syntax
            const usersCollection = db.collection('users');
            // FIX: Use Firebase v8 syntax
            const querySnapshot = await usersCollection.get();
            const allUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Omit<User, 'password'>[];
            setUsers(allUsers);
        } catch (error) {
            console.error("Error fetching all users from Firestore:", error);
            setUsers([]);
        }
    }, []);

    useEffect(() => {
        // FIX: Use Firebase v8 syntax
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // FIX: Use Firebase v8 syntax
                const userDocRef = db.collection('users').doc(firebaseUser.uid);
                // FIX: Use Firebase v8 syntax
                const userDocSnap = await userDocRef.get();
                // FIX: Use Firebase v8 syntax (.exists is a property)
                if (userDocSnap.exists) {
                    const userData = userDocSnap.data();
                    setUser({
                        id: firebaseUser.uid,
                        username: userData?.username,
                        role: userData?.role,
                        apiKeyId: userData?.apiKeyId,
                    });
                    if (user?.role === 'admin' || user?.role === 'manager') {
                        await loadAllUsers();
                    }
                } else {
                    // Auth user exists but no data in Firestore, sign them out.
                    // FIX: Use Firebase v8 syntax
                    await auth.signOut();
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });
        
        // Initial load of all users for management panel
        loadAllUsers();

        return () => unsubscribe();
    }, [loadAllUsers, user?.role]);

    const login = useCallback(async (username: string, password: string) => {
        const email = `${username.toLowerCase()}@internal.app`;
        // FIX: Use Firebase v8 syntax
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged will handle setting the user state.
    }, []);

    const logout = useCallback(async () => {
        // FIX: Use Firebase v8 syntax
        await auth.signOut();
        // onAuthStateChanged will handle clearing the user state.
    }, []);

    const addUser = useCallback(async (newUser: Omit<User, 'id'>) => {
        // FIX: Use Firebase v8 syntax
        const q = db.collection('users').where("username", "==", newUser.username);
        // FIX: Use Firebase v8 syntax
        const querySnapshot = await q.get();
        if (!querySnapshot.empty) {
            throw new Error('Username already exists.');
        }

        const email = `${newUser.username.toLowerCase()}@internal.app`;
        // FIX: Use Firebase v8 syntax
        const userCredential = await auth.createUserWithEmailAndPassword(email, newUser.password!);
        const newFirebaseUser = userCredential.user;

        if (newFirebaseUser) {
            const { password, ...userData } = newUser;
            // FIX: Use Firebase v8 syntax
            await db.collection('users').doc(newFirebaseUser.uid).set(userData);
            await loadAllUsers();
        } else {
            throw new Error("Failed to create user account.");
        }
    }, [loadAllUsers]);

    const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
        // Admin cannot change password from client SDK, so we exclude it.
        const { password, ...firestoreUpdates } = updates; 
        
        // FIX: Use Firebase v8 syntax
        await db.collection('users').doc(userId).update(firestoreUpdates);

        if (user?.id === userId) {
            setUser(prev => prev ? { ...prev, ...firestoreUpdates } : null);
        }
        await loadAllUsers();
    }, [user, loadAllUsers]);

    const deleteUser = useCallback(async (userId: string) => {
        if (user?.id === userId) {
            throw new Error("You cannot delete your own account.");
        }
        // This only deletes the Firestore record, not the Firebase Auth user,
        // which is a limitation of the client-side SDK for admin actions.
        // This will effectively disable the user in the app.
        // FIX: Use Firebase v8 syntax
        await db.collection('users').doc(userId).delete();
        await loadAllUsers();
    }, [user, loadAllUsers]);

    const value = { user, users, isLoading, login, logout, addUser, updateUser, deleteUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
