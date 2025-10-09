import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ApiKey } from '../types';

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
    logout: () => void;
    addUser: (newUser: Omit<User, 'id'>) => void;
    updateUser: (userId: string, updates: Partial<User>) => void;
    deleteUser: (userId: string) => void;
}

const USER_DB_KEY = 'user_database';
const SESSION_KEY = 'user_session';

export const AuthContext = createContext<AuthContextType>({
    user: null,
    users: [],
    isLoading: true,
    login: async () => {},
    logout: () => {},
    addUser: () => {},
    updateUser: () => {},
    deleteUser: () => {},
});

const hash = (str: string) => `hashed_${str}`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize and load users from localStorage
    useEffect(() => {
        try {
            // Give default admin the first API key if it exists
            const apiKeys: ApiKey[] = JSON.parse(localStorage.getItem('API_KEY_LIST') || '[]');

            const storedDb = localStorage.getItem(USER_DB_KEY);
            if (storedDb) {
                setUsers(JSON.parse(storedDb));
            } else {
                const defaultAdmin: User = { 
                    id: 'default-admin-1', 
                    username: 'admin', 
                    password: hash('admin'), 
                    role: 'admin',
                    apiKeyId: apiKeys[0]?.id,
                };
                localStorage.setItem(USER_DB_KEY, JSON.stringify([defaultAdmin]));
                setUsers([defaultAdmin]);
            }

            const storedSession = localStorage.getItem(SESSION_KEY);
            if (storedSession) {
                setUser(JSON.parse(storedSession));
            }
        } catch (error) {
            console.error("Failed to process user storage", error);
            localStorage.removeItem(USER_DB_KEY);
            localStorage.removeItem(SESSION_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveUsers = (updatedUsers: User[]) => {
        localStorage.setItem(USER_DB_KEY, JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
    };

    const login = useCallback(async (username: string, password: string) => {
        const userToLogin = users.find(u => u.username === username);

        if (userToLogin && userToLogin.password === hash(password)) {
            const { password: _, ...userSession } = userToLogin;
            localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
            setUser(userSession);
        } else {
            throw new Error('Invalid username or password');
        }
    }, [users]);

    const logout = useCallback(() => {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
    }, []);

    const addUser = useCallback((newUser: Omit<User, 'id'>) => {
        if (users.some(u => u.username === newUser.username)) {
            throw new Error('Username already exists.');
        }
        const userToAdd: User = {
            ...newUser,
            id: `user-${Date.now()}`,
            password: hash(newUser.password!),
        };
        saveUsers([...users, userToAdd]);
    }, [users]);

    const updateUser = useCallback((userId: string, updates: Partial<User>) => {
        setUsers(currentUsers => {
            const newUsers = currentUsers.map(u => {
                if (u.id === userId) {
                    const updatedUser = { ...u, ...updates };
                    // If password is being changed, hash it
                    if(updates.password) {
                        updatedUser.password = hash(updates.password);
                    }
                    return updatedUser;
                }
                return u;
            });
            saveUsers(newUsers);

            // If the currently logged-in user is the one being updated, update their session
            if (user?.id === userId) {
                const { password, ...userSession } = newUsers.find(u => u.id === userId)!;
                localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
                setUser(userSession);
            }
            return newUsers;
        });
    }, [users, user]);

    const deleteUser = useCallback((userId: string) => {
        if (user?.id === userId) {
            throw new Error("You cannot delete your own account.");
        }
        const updatedUsers = users.filter(u => u.id !== userId);
        saveUsers(updatedUsers);
    }, [users, user]);

    const publicUsers = users.map(({ password, ...rest }) => rest);

    const value = { user, users: publicUsers, isLoading, login, logout, addUser, updateUser, deleteUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};