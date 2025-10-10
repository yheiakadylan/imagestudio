

import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Button from './common/Button';

interface LoginPageProps {
    onNavigateToSignUp: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToSignUp }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const auth = useContext(AuthContext);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await auth.login(username, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen bg-[#0d0c1c] flex items-center justify-center p-4">
             <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute inset-[-25%] bg-[conic-gradient(from_0deg,#ff3eec,#ffd23f,#00d4ff,#7cffcb,#ff3eec)] opacity-10 blur-[72px] saturate-150 animate-[spin_18s_linear_infinite]"></div>
            </div>
            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-lg text-white">
                <h1 className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 bg-clip-text text-transparent">
                    AI Image Studio
                </h1>
                <p className="text-center text-gray-400 mb-6">Please sign in to continue</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/20 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/20 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </form>

            </div>
        </div>
    );
};

export default LoginPage;