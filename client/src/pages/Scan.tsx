import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, CameraOff } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export default function ScanPage() {
  const [, setLocation] = useLocation();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        if (state === 2) await scannerRef.current.stop();
      } catch (_) {}
      try { scannerRef.current.clear?.(); } catch (_) {}
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const element = document.getElementById("reader");
        if (!element || !mountedRef.current) return;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          if (mountedRef.current) setCameraError("Aucune caméra détectée sur cet appareil.");
          return;
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const scanConfig = { fps: 10, qrbox: { width: 240, height: 240 } };
        const onSuccess = (decodedText: string) => {
          stopScanner().then(() => {
            if (mountedRef.current) setLocation(`/product/${decodedText}`);
          });
        };

        // Try rear camera first (mobile), fall back to front/webcam (PC)
        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            scanConfig,
            onSuccess,
            () => {}
          );
        } catch {
          await html5QrCode.start(
            { facingMode: "user" },
            scanConfig,
            onSuccess,
            () => {}
          );
        }

        if (mountedRef.current) setStarted(true);
      } catch (err: any) {
        if (!mountedRef.current) return;
        const msg = err?.message ?? "";
        if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
          setCameraError("Accès à la caméra refusé. Autorise la caméra dans les paramètres de ton navigateur puis recharge la page.");
        } else {
          setCameraError("Impossible d'accéder à la caméra. Vérifie que tu n'es pas dans un cadre intégré (ouvre l'app dans un onglet séparé).");
        }
      }
    };

    startScanner();
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [stopScanner, setLocation]);

  return (
    <div className="min-h-screen bg-black relative flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center text-white">
        <button
          data-testid="button-back"
          onClick={() => setLocation("/")}
          className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Scanner</h1>
        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative">

        {cameraError ? (
          /* Error state */
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <CameraOff className="w-9 h-9 text-white/50" />
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">{cameraError}</p>
            <button
              onClick={() => {
                setCameraError(null);
                setStarted(false);
              }}
              className="mt-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-full text-white text-sm font-medium transition"
            >
              Réessayer
            </button>
          </div>
        ) : (
          /* Camera viewport */
          <div className="w-full max-w-md relative">
            <div
              id="reader"
              className="w-full overflow-hidden rounded-3xl bg-black"
              style={{ minHeight: 300 }}
            />

            {/* Corner overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl -mb-1 -mr-1" />
                {started && (
                  <div className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-scan" />
                )}
              </div>
            </div>

            {/* Loading state */}
            {!started && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/60 text-sm">Démarrage de la caméra…</p>
              </div>
            )}
          </div>
        )}

        {!cameraError && (
          <p className="text-white/50 text-xs mt-6 text-center px-8 z-20">
            Pointez la caméra vers un code-barres pour l'analyser instantanément.
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
