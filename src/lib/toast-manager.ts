import type { Toast } from '../components/ui/toast';

// Global toast manager for use outside React components
class ToastManager {
    private listeners: ((toast: Omit<Toast, 'id'>) => void)[] = [];

    addListener(listener: (toast: Omit<Toast, 'id'>) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    show(toast: Omit<Toast, 'id'>) {
        this.listeners.forEach(listener => listener(toast));
    }

    success(title: string, message: string, duration?: number) {
        this.show({ type: 'success', title, message, duration });
    }

    error(title: string, message: string, duration?: number) {
        this.show({ type: 'error', title, message, duration });
    }

    warning(title: string, message: string, duration?: number) {
        this.show({ type: 'warning', title, message, duration });
    }

    info(title: string, message: string, duration?: number) {
        this.show({ type: 'info', title, message, duration });
    }
}

export const toastManager = new ToastManager();

// Helper function to replace alert() calls
export const showAlert = (message: string, title = 'Alert') => {
    toastManager.info(title, message);
};

export const showError = (message: string, title = 'Error') => {
    toastManager.error(title, message);
};

export const showSuccess = (message: string, title = 'Success') => {
    toastManager.success(title, message);
};

export const showWarning = (message: string, title = 'Warning') => {
    toastManager.warning(title, message);
};