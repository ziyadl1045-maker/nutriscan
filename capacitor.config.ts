import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ma.nutriscan.app',
  appName: 'NutriScan',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-1132707752513601~7888880299',
    },
  },
};

export default config;
