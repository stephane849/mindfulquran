import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindfulquran.app',
  appName: 'Mindful Quran',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
