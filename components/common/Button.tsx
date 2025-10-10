import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'warn';
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
    const baseClasses = "px-3.5 py-2.5 rounded-xl cursor-pointer font-bold border-none relative overflow-hidden transition-transform transform hover:-translate-y-px disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed flex items-center justify-center";
    
    const variantClasses = {
        primary: 'bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white shadow-lg shadow-blue-500/20',
        ghost: 'bg-white/10 text-gray-200 border border-white/20 hover:bg-white/20 backdrop-blur-sm',
        warn: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
    };

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

    return (
        <button className={combinedClasses} {...props}>
            {children}
        </button>
    );
};

export default Button;