import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const TextArea: React.FC<TextAreaProps> = ({ className = '', ...props }) => {
    const baseClasses = "w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none min-h-[88px]";
    
    return (
        <textarea className={`${baseClasses} ${className}`} {...props} />
    );
};

export default TextArea;