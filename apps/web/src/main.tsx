import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App';
import './index.css';

// Initialize Capacitor plugins
const initCapacitor = async () => {
  try {
    // Hide splash screen after app loads
    await SplashScreen.hide();

    // Configure status bar for Android
    await StatusBar.setBackgroundColor({ color: '#f59e0b' });
    await StatusBar.setStyle({ style: Style.Light });
  } catch (error) {
    // Running in browser, not native app
    console.log('Running in browser mode');
  }
};

// Handle Android back button
CapApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    CapApp.exitApp();
  }
});

initCapacitor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
