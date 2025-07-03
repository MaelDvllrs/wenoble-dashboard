import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Recharge automatiquement la page et active la nouvelle version du SW
    updateSW(true);
  },
  onOfflineReady() {
    console.log('Application prête à fonctionner.');
  }
});