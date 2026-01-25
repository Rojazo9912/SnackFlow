import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function useCapacitor() {
  useEffect(() => {
    const initCapacitor = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Ocultar splash screen
        await SplashScreen.hide();

        // Configurar status bar
        await StatusBar.setBackgroundColor({ color: '#f59e0b' });
        await StatusBar.setStyle({ style: Style.Light });

        // Manejar boton de retroceso en Android
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch (error) {
        console.error('Error initializing Capacitor:', error);
      }
    };

    initCapacitor();

    return () => {
      if (Capacitor.isNativePlatform()) {
        App.removeAllListeners();
      }
    };
  }, []);
}

// Hook para vibracion en acciones importantes
export function useHaptics() {
  const vibrate = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!Capacitor.isNativePlatform()) return;

    const impactStyles = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    try {
      await Haptics.impact({ style: impactStyles[style] });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  };

  const vibrateSuccess = () => vibrate('light');
  const vibrateError = () => vibrate('heavy');
  const vibrateTap = () => vibrate('light');

  return { vibrate, vibrateSuccess, vibrateError, vibrateTap };
}

// Utilidad para detectar plataforma
export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
