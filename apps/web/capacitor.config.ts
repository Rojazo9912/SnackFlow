import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snackflow.app',
  appName: 'SnackFlow',
  webDir: 'dist',
  server: {
    // Para desarrollo, puedes usar tu servidor local
    // url: 'http://192.168.1.X:5173',
    // cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f59e0b',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      backgroundColor: '#f59e0b',
      style: 'LIGHT'
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff'
  }
};

export default config;
