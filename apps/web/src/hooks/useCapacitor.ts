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
    };

    initCapacitor();

    return () => {
      App.removeAllListeners();
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

    await Haptics.impact({ style: impactStyles[style] });
  };

  const vibrateSuccess = () => vibrate('light');
  const vibrateError = () => vibrate('heavy');
  const vibrateTap = () => vibrate('light');

  return { vibrate, vibrateSuccess, vibrateError, vibrateTap };
}

// Utilidad para detectar plataforma
export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
