import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.zengarden.app',
    appName: 'ZenGarden',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#181a20',
            showSpinner: false,
            androidSpinnerStyle: 'small',
            iosSpinnerStyle: 'small',
            splashFullScreen: true,
            splashImmersive: true
        }
    }
};

export default config;
