import React from 'react';

interface DarkCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

const DarkCard: React.FC<DarkCardProps> = ({
    children,
    className = '',
    hover = true
}) => {
    return (
        <div
            className={`
        bg-white dark:bg-dark-bg-secondary 
        border border-gray-200 dark:border-dark-border-subtle 
        rounded-xl p-6
        ${hover ? 'hover:border-gray-300 dark:hover:border-dark-border-focus hover:shadow-lg dark:hover:shadow-dark-md' : ''}
        transition-all duration-200
        ${className}
      `}
        >
            {children}
        </div>
    );
};

export default DarkCard;
