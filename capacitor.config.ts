import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dolphysn.app',
  appName: 'DolphySN',
  webDir: 'dist',
  server: {
    url: 'https://dolphysn.com',
    cleartext: true
  }
};

export default config;
