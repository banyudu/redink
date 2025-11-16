import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface Toast {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    actions?: {
        label: string;
        onClick: () => void;
    }[];
}

interface ToastComponentProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

const ToastComponent: React.FC<ToastComponentProps> = ({ toast, onRemove }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const timer = setTimeout(() => setIsVisible(true), 50);

        // Auto remove after duration
        if (toast.duration && toast.duration > 0) {
            const removeTimer = setTimeout(() => {
                handleRemove();
            }, toast.duration);

            return () => {
                clearTimeout(timer);
                clearTimeout(removeTimer);
            };
        }

        return () => clearTimeout(timer);
    }, [toast.duration]);

    const handleRemove = () => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-600" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-600" />;
            case 'info':
                return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'error':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 'warning':
                return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
            case 'info':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        }
    };

    return (
        <div className={`transform transition-all duration-300 ${isVisible
                ? 'translate-x-0 opacity-100'
                : 'translate-x-full opacity-0'
            }`}>
            <div className={`glass border backdrop-blur-xl rounded-lg p-4 shadow-lg max-w-sm ${getColors()}`}>
                <div className="flex items-start gap-3">
                    {getIcon()}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                {toast.title}
                            </h4>
                            <button
                                onClick={handleRemove}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {toast.message}
                        </p>

                        {toast.actions && toast.actions.length > 0 && (
                            <div className="flex gap-2 mt-3">
                                {toast.actions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={action.onClick}
                                        className="text-xs px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <ToastComponent
                    key={toast.id}
                    toast={toast}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
};

// Hook for using toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (toast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? 5000, // Default 5 seconds
        };

        setToasts(prev => [...prev, newToast]);
        return id;
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const clearToasts = () => {
        setToasts([]);
    };

    return {
        toasts,
        addToast,
        removeToast,
        clearToasts,
    };
};