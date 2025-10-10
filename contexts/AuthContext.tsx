import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, auth, firebaseConfig } from '../services/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
} from 'firebase/firestore';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    getAuth,
} from 'firebase/auth';

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
    signUp: (username: string, password: string) => Promise<void>;
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
    signUp: async () => {},
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
            const usersCollection = collection(db, 'users');
            const querySnapshot = await getDocs(usersCollection);
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

    // Effect for handling auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUser({
                        id: firebaseUser.uid,
                        username: userData?.username,
                        role: userData?.role,
                        apiKeyId: userData?.apiKeyId,
                    });
                } else {
                    // Auth user exists but no data in Firestore, sign them out.
                    await signOut(auth);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    // Effect for loading all users when the current user has the appropriate role
    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'manager') {
            loadAllUsers();
        } else {
            setUsers([]); // Clear user list if not an admin/manager
        }
    }, [user, loadAllUsers]);

    const login = useCallback(async (username: string, password: string) => {
        const email = `${username.toLowerCase()}@internal.app`;
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle setting the user state.
    }, []);

    const logout = useCallback(async () => {
        await signOut(auth);
        // onAuthStateChanged will handle clearing the user state.
    }, []);

    const signUp = useCallback(async (username: string, password: string) => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('Username already exists.');
        }

        const email = `${username.toLowerCase()}@internal.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newFirebaseUser = userCredential.user;

        if (newFirebaseUser) {
            const userData = {
                username: username,
                role: 'user', // Default role for new sign-ups
                apiKeyId: '', // No key by default
            };
            await setDoc(doc(db, 'users', newFirebaseUser.uid), userData);
            // onAuthStateChanged will handle setting the user state and logging them in.
        } else {
            throw new Error("Failed to create user account.");
        }
    }, []);

    const addUser = useCallback(async (newUser: Omit<User, 'id'>) => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("username", "==", newUser.username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('Username already exists.');
        }
        
        // Create a temporary app instance to create user without signing them in on main app
        const tempAppName = `temp-user-creation-${Date.now()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        try {
            const email = `${newUser.username.toLowerCase()}@internal.app`;
            const userCredential = await createUserWithEmailAndPassword(tempAuth, email, newUser.password!);
            const newFirebaseUser = userCredential.user;

            if (newFirebaseUser) {
                const { password, ...userData } = newUser;
                await setDoc(doc(db, 'users', newFirebaseUser.uid), userData);
                await loadAllUsers();
            } else {
                throw new Error("Failed to create user account.");
            }
        } finally {
            // Clean up the temporary app to avoid memory leaks
            await deleteApp(tempApp);
        }
    }, [loadAllUsers]);

    const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
        // Admin cannot change password from client SDK, so we exclude it.
        const { password, ...firestoreUpdates } = updates; 
        
        await updateDoc(doc(db, 'users', userId), firestoreUpdates);

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
        await deleteDoc(doc(db, 'users', userId));
        await loadAllUsers();
    }, [user, loadAllUsers]);

    const value = { user, users, isLoading, login, logout, signUp, addUser, updateUser, deleteUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};