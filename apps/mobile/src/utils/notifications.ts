// Browser notification utilities
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const showBrowserNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            ...options,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        return notification;
    }
    return null;
};

// Audio file cache to prevent reloading
const soundCache: Record<string, HTMLAudioElement> = {};

type SoundType = 'success' | 'error' | 'scan' | 'notification' | 'delete';

export const playSound = (type: SoundType = 'notification') => {
    try {
        const soundFiles: Record<SoundType, string> = {
            success: '/success.wav',
            error: '/error.wav',
            scan: '/scan.wav',
            delete: '/delete.wav',
            notification: '/notification.mp3'
        };

        const fileName = soundFiles[type];

        if (!soundCache[type]) {
            soundCache[type] = new Audio(fileName);
        }

        const audio = soundCache[type];
        audio.currentTime = 0; // Reset to start

        // Play and handle potential interaction errors
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Audio playback failed (likely user interaction required):', error);
            });
        }
    } catch (error) {
        console.warn('Silent mode: Could not play audio', error);
    }
};

export const playNotificationSound = () => playSound('notification');

