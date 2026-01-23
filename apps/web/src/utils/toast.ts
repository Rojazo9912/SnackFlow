import toast, { ToastOptions } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { createElement } from 'react';

const defaultOptions: ToastOptions = {
    duration: 4000,
    position: 'top-right',
};

export const showToast = {
    success: (message: string, options?: ToastOptions) => {
        return toast.success(message, {
            ...defaultOptions,
            ...options,
            icon: createElement(CheckCircle, { className: 'w-5 h-5 text-green-500' }),
            className: 'dark:bg-gray-800 dark:text-white',
        });
    },

    error: (message: string, options?: ToastOptions) => {
        return toast.error(message, {
            ...defaultOptions,
            ...options,
            icon: createElement(XCircle, { className: 'w-5 h-5 text-red-500' }),
            className: 'dark:bg-gray-800 dark:text-white',
        });
    },

    warning: (message: string, options?: ToastOptions) => {
        return toast(message, {
            ...defaultOptions,
            ...options,
            icon: createElement(AlertCircle, { className: 'w-5 h-5 text-yellow-500' }),
            className: 'dark:bg-gray-800 dark:text-white',
        });
    },

    info: (message: string, options?: ToastOptions) => {
        return toast(message, {
            ...defaultOptions,
            ...options,
            icon: createElement(Info, { className: 'w-5 h-5 text-blue-500' }),
            className: 'dark:bg-gray-800 dark:text-white',
        });
    },

    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string;
            error: string;
        }
    ) => {
        return toast.promise(
            promise,
            {
                loading: messages.loading,
                success: messages.success,
                error: messages.error,
            },
            {
                ...defaultOptions,
                className: 'dark:bg-gray-800 dark:text-white',
            }
        );
    },
};
