import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindfulquran.app',
  appName: 'MindfulQuran',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
