import React from 'react';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    loading?: boolean;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({
    children,
    loading = false,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <button
            disabled={disabled || loading}
            className={`
        bg-gray-200 dark:bg-dark-bg-tertiary 
        text-gray-800 dark:text-dark-text-primary 
        font-medium px-6 py-2.5 rounded-lg
        border border-gray-300 dark:border-dark-border-subtle
        hover:bg-gray-300 dark:hover:bg-dark-border-focus
        hover:border-gray-400 dark:hover:border-dark-border-focus
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Loading...
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default SecondaryButton;
