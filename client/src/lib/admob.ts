import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdOptions, AdLoadInfo, InterstitialAdPluginEvents } from '@capacitor-community/admob';

export const ADMOB_IDS = {
  banner: 'ca-app-pub-1132707752513601/9796858334',
  interstitial: 'ca-app-pub-1132707752513601/5673780497',
};

export const isNativePlatform = () => Capacitor.isNativePlatform();

export async function initAdMob() {
  if (!isNativePlatform()) return;
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: false,
      testingDevices: [],
      initializeForTesting: false,
    });
  } catch (e) {
    console.error('AdMob init error:', e);
  }
}

export async function showBannerAd() {
  if (!isNativePlatform()) return;
  try {
    const options: BannerAdOptions = {
      adId: ADMOB_IDS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 60,
      isTesting: false,
    };
    await AdMob.showBanner(options);
  } catch (e) {
    console.error('Banner ad error:', e);
  }
}

export async function hideBannerAd() {
  if (!isNativePlatform()) return;
  try {
    await AdMob.removeBanner();
  } catch (e) {
    console.error('Remove banner error:', e);
  }
}

export async function showInterstitialAd(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const options: AdOptions = {
      adId: ADMOB_IDS.interstitial,
      isTesting: false,
    };
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
    return true;
  } catch (e) {
    console.error('Interstitial ad error:', e);
    return false;
  }
}
