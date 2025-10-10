import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Button from './common/Button';

interface SignUpPageProps {
    onNavigateToLogin: () => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigateToLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const auth = useContext(AuthContext);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            await auth.signUp(username, password);
            // On success, the AuthGate will automatically switch to the App component
        } catch (err: any) {
            if (err.message.includes('already-in-use') || err.message.includes('already exists')) {
                 setError('This username is already taken.');
            } else {
                 setError(err.message || 'Sign-up failed. Please try again.');
            }
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
                    Create Account
                </h1>
                <p className="text-center text-gray-400 mb-6">Join the AI Image Studio</p>
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
                            required
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/20 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/20 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                     <div className="mb-6">
                        <label className="block text-gray-300 mb-2" htmlFor="confirm-password">
                            Confirm Password
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/20 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>
                 <p className="text-sm text-gray-400 text-center mt-6">
                    Already have an account?{' '}
                    <button onClick={onNavigateToLogin} className="font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-none cursor-pointer">
                        Sign In
                    </button>
                </p>
            </div>
        </div>
    );
};

export default SignUpPage;
