import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Button from './common/Button';

interface HeaderProps {
    onSettingsClick: () => void;
    onImageLogClick: () => void;
    onImageEditorClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onImageLogClick, onImageEditorClick }) => {
    const auth = useContext(AuthContext);

    return (
        <header className="flex-shrink-0 flex items-center justify-between p-3 bg-black/10 border-b border-white/10 backdrop-blur-sm">
            <div className="text-xl font-black bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 bg-clip-text text-transparent">
                AI Image Studio
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">Welcome, {auth.user?.username || 'User'}! </span>
                <Button variant="ghost" onClick={onImageEditorClick}>
                    Image Editor
                </Button>
                <Button variant="ghost" onClick={onImageLogClick}>
                    Image Log
                </Button>
                {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
                    <Button variant="ghost" onClick={onSettingsClick}>
                        Settings
                    </Button>
                )}
                <Button variant="ghost" onClick={auth.logout}>
                    Logout
                </Button>
            </div>
        </header>
    );
};

export default Header;
