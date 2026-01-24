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

export const playNotificationSound = async () => {
    try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.7; // Increased volume for better audibility

        // Try to play the sound
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('✅ Notification sound played successfully');
                })
                .catch(err => {
                    // Browser blocked autoplay
                    console.warn('⚠️ Could not play sound (autoplay blocked):', err.message);
                    console.log('💡 User interaction required to enable sound');
                });
        }
    } catch (error) {
        console.warn('❌ Error playing notification sound:', error);
    }
};

