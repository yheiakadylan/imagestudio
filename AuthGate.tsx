
import React, { useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import App from './App';
import LoginPage from './components/LoginPage';

const AuthGate: React.FC = () => {
    const auth = useContext(AuthContext);

    if (auth.isLoading) {
        return (
            <div className="w-screen h-screen bg-[#0d0c1c] flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }
    
    return auth.user ? <App /> : <LoginPage />;
};

export default AuthGate;
