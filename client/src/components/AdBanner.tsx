import { useEffect } from 'react';
import { showBannerAd, hideBannerAd, isNativePlatform } from '@/lib/admob';

interface AdBannerProps {
  show: boolean;
}

export function AdBanner({ show }: AdBannerProps) {
  useEffect(() => {
    if (!isNativePlatform()) return;
    if (show) {
      showBannerAd();
    } else {
      hideBannerAd();
    }
    return () => {
      hideBannerAd();
    };
  }, [show]);

  if (isNativePlatform()) return null;

  if (!show) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-xs text-gray-400 font-medium shadow-sm">
        📢 Publicité — Passez à Premium pour supprimer les pubs
      </div>
    </div>
  );
}
