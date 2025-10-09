
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ children, className = '', ...props }) => {
    const baseClasses = "w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none";
    
    return (
        <select className={`${baseClasses} ${className}`} {...props}>
            {children}
        </select>
    );
};

export default Select;
