import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Camera, 
  Keyboard, 
  Check, 
  Barcode as BarcodeIcon, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  ShoppingCart, 
  RotateCcw,
  CheckCircle2,
  Package,
  QrCode,
  Image as ImageIcon,
  Upload,
  Zap,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { formatCurrency } from '../utils/currencyUtils';
import { resolveScannedBarcodeOrQr } from '../utils/skuBarcodeUtils';
import { InventoryItem } from '../types';

type ScanFeedback = 
  | { type: 'SUCCESS'; item: InventoryItem; qty: number; rawCode: string }
  | { type: 'DUPLICATE'; item: InventoryItem; currentQty: number; added?: boolean; rawCode: string }
  | { type: 'NOT_FOUND'; barcode: string };

export const BarcodeScannerModal: React.FC = () => {
  const { 
    isScannerModalOpen, 
    setIsScannerModalOpen, 
    items, 
    cart, 
    addToCart, 
    settings, 
    addToast 
  } = useApp();

  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraPaused, setIsCameraPaused] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [activeScanMode, setActiveScanMode] = useState<'camera' | 'file'>('camera');
  const [scanBehavior, setScanBehavior] = useState<'single_review' | 'continuous_cooldown'>('single_review');
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  
  // Single-item scan state & duplicate confirmation
  const [scanResult, setScanResult] = useState<ScanFeedback | null>(null);
  const isLockedRef = useRef<boolean>(false);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const cooldownTimerRef = useRef<number | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'interactive-barcode-scanner';

  // Haptic feedback trigger for mobile devices
  const triggerHaptic = (type: 'success' | 'warning' | 'error') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'success') {
          navigator.vibrate(70);
        } else if (type === 'warning') {
          navigator.vibrate([60, 50, 60]);
        } else {
          navigator.vibrate([100, 80, 100]);
        }
      } catch {
        // Ignore haptics failure if not permitted
      }
    }
  };

  // Fetch available camera devices when modal opens
  useEffect(() => {
    if (!isScannerModalOpen) {
      stopCamera();
      setScanResult(null);
      isLockedRef.current = false;
      setIsCameraPaused(false);
      setCooldownRemaining(0);
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      return;
    }

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          const deviceList = devices.map(d => ({ 
            id: d.id, 
            label: d.label || (d.id ? `Camera ${d.id.slice(0, 5)}` : 'Camera') 
          }));
          setCameras(deviceList);
          // Prefer back / rear camera (environment) for barcodes
          const backCam = devices.find(d => 
            d.label && (d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('rear'))
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No camera devices found on this system. You can still scan QR images or enter codes manually.');
        }
      })
      .catch((err) => {
        setCameraError(`Camera permission or hardware notice: ${err.message || err}`);
      });

    return () => {
      stopCamera();
    };
  }, [isScannerModalOpen]);

  const processScannedCode = (rawCode: string) => {
    const cleanCode = (rawCode || '').trim();
    if (!cleanCode) return;

    const now = Date.now();
    const timeSinceLastScan = now - lastScannedTimeRef.current.time;
    const isSameCode = lastScannedTimeRef.current.code.toLowerCase() === cleanCode.toLowerCase();

    // In single_review mode, lock immediately until user resumes
    if (scanBehavior === 'single_review') {
      if (isLockedRef.current) return;
      isLockedRef.current = true;

      // Physically pause the video stream so it immediately freezes on mobile
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.pause(true);
          setIsCameraPaused(true);
        } catch {
          // Pause error safe fallback
        }
      }
    } else {
      // In continuous mode: apply 2.5s anti-repeat lock for the exact same code, and 1.0s gap between any codes
      if (isSameCode && timeSinceLastScan < 2500) {
        return;
      }
      if (timeSinceLastScan < 900) {
        return;
      }
      lastScannedTimeRef.current = { code: cleanCode, time: now };

      // Trigger cooldown animation
      setCooldownRemaining(2.5);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = window.setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 0.2) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return parseFloat((prev - 0.2).toFixed(1));
        });
      }, 200);
    }

    lastScannedTimeRef.current = { code: cleanCode, time: now };

    // Use smart multi-format QR and Barcode resolver
    const { item: matchedItem, extractedCode } = resolveScannedBarcodeOrQr(cleanCode, items);

    if (!matchedItem) {
      triggerHaptic('error');
      soundEffects.playError();
      setScanResult({ type: 'NOT_FOUND', barcode: extractedCode || cleanCode });
      return;
    }

    // Check if item is already in active cart
    const existingInCart = cart.find(c => c.item.id === matchedItem.id);

    if (existingInCart) {
      // DUPLICATE DETECTED: Prompt user for confirmation!
      triggerHaptic('warning');
      soundEffects.playWarning();
      setScanResult({
        type: 'DUPLICATE',
        item: matchedItem,
        currentQty: existingInCart.quantity,
        added: false,
        rawCode: extractedCode
      });
    } else {
      // UNIQUE ITEM: Add 1 unit and show success confirmation
      triggerHaptic('success');
      soundEffects.playScanSuccess();
      addToCart(matchedItem, 1);
      setScanResult({
        type: 'SUCCESS',
        item: matchedItem,
        qty: 1,
        rawCode: extractedCode
      });
    }
  };

  const startCamera = async (cameraId: string) => {
    try {
      setCameraError(null);
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      // Configure Html5Qrcode with all 1D and 2D barcode + QR formats
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.MAXICODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      html5QrCodeRef.current = html5QrCode;

      // Dynamic square scanner box calculation that accommodates QR codes of any size
      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edgeSize = Math.max(200, Math.floor(minEdge * 0.82));
          return { width: edgeSize, height: edgeSize };
        },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          // Immediate Guard: Only scan one at a time when in single review mode
          if (scanBehavior === 'single_review' && isLockedRef.current) {
            return;
          }
          processScannedCode(decodedText);
        },
        () => {
          // Frame misses are normal
        }
      );

      setCameraActive(true);
      setIsCameraPaused(false);
      isLockedRef.current = false;
    } catch (err) {
      setCameraError(`Unable to start camera: ${(err as Error).message || err}`);
      setCameraActive(false);
      setIsCameraPaused(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // Ignore stop error
      }
      setCameraActive(false);
      setIsCameraPaused(false);
    }
  };

  // Scan QR from image file upload
  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.AZTEC,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
          verbose: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        });
        html5QrCodeRef.current = scanner;
      }

      const decodedResult = await scanner.scanFile(file, true);
      if (decodedResult) {
        processScannedCode(decodedResult);
      }
    } catch (err) {
      soundEffects.playError();
      addToast('error', 'QR Decode Failed', 'Could not read any QR or barcode in this image. Please try a clearer photo or camera scan.');
    } finally {
      setIsFileScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Auto-start camera when selectedCameraId is ready
  useEffect(() => {
    if (isScannerModalOpen && activeScanMode === 'camera' && selectedCameraId && !cameraActive && !scanResult) {
      startCamera(selectedCameraId);
    }
  }, [isScannerModalOpen, activeScanMode, selectedCameraId, scanResult]);

  // Resume camera for the next item (unpause video feed)
  const resumeNextScan = () => {
    setScanResult(null);
    isLockedRef.current = false;

    if (html5QrCodeRef.current && isCameraPaused) {
      try {
        html5QrCodeRef.current.resume();
        setIsCameraPaused(false);
      } catch {
        if (selectedCameraId) {
          startCamera(selectedCameraId);
        }
      }
    } else if (!cameraActive && selectedCameraId && activeScanMode === 'camera') {
      startCamera(selectedCameraId);
    }
  };

  // Confirm duplicate scan addition (+1)
  const handleConfirmDuplicateAdd = () => {
    if (scanResult && scanResult.type === 'DUPLICATE') {
      const { item, currentQty } = scanResult;
      if (currentQty >= item.stock) {
        addToast('warning', 'Max Stock Limit', `Cannot add more than ${item.stock} available units.`);
        return;
      }
      addToCart(item, 1);
      triggerHaptic('success');
      soundEffects.playScanSuccess();
      setScanResult({
        ...scanResult,
        currentQty: currentQty + 1,
        added: true
      });
      addToast('success', 'Quantity Updated', `Added +1 copy of ${item.name} to cart.`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processScannedCode(manualCode.trim());
    setManualCode('');
  };

  if (!isScannerModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5">
                <span>QR & Barcode Scanner</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Anti-Double Scan
                </span>
              </h3>
              <p className="text-xs text-emerald-400 font-medium">Single-Item Protection &bull; Haptic Mobile Feedback</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveScanMode('camera');
                  if (selectedCameraId) startCamera(selectedCameraId);
                }}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  activeScanMode === 'camera' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Live Cam</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveScanMode('file');
                }}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  activeScanMode === 'file' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">File</span>
              </button>
            </div>

            <button
              onClick={() => {
                stopCamera();
                setIsScannerModalOpen(false);
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scan Behavior Toggle Banner */}
        <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">Scan Mode:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setScanBehavior('single_review')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                scanBehavior === 'single_review'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pauses camera on scan to prevent accidental duplicate additions"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Single Item (Freeze & Review)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanBehavior('continuous_cooldown');
                if (isCameraPaused) resumeNextScan();
              }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                scanBehavior === 'continuous_cooldown'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Scans continuously with 2.5s anti-repeat cooldown per barcode"
            >
              <Zap className="w-3 h-3" />
              <span>Continuous (Rapid Mode)</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5">
          
          {/* CAMERA VIEWFINDER & SCAN RESULT CARD */}
          {activeScanMode === 'camera' ? (
            <div className="relative bg-black rounded-xl overflow-hidden border border-slate-800 aspect-[4/3] flex flex-col items-center justify-center shadow-inner">
              <div id={scannerContainerId} className={`w-full h-full ${scanResult && scanBehavior === 'single_review' ? 'opacity-20 blur-xs' : ''}`} />
              
              {/* Active Viewfinder Overlay (When Idle Scanning) */}
              {cameraActive && !isCameraPaused && !scanResult && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-emerald-400/90 rounded-2xl relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                    {/* Animated laser line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399] animate-bounce" style={{ animationDuration: '1.8s' }} />
                    {/* Corner brackets */}
                    <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                    <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                    <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                  </div>
                  
                  {/* Cooldown feedback or instructions */}
                  {cooldownRemaining > 0 ? (
                    <span className="text-[11px] font-mono text-amber-300 mt-3 bg-amber-950/90 px-3.5 py-1 rounded-full border border-amber-500/40 shadow-md animate-pulse">
                      Anti-repeat cooldown: {cooldownRemaining}s
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-emerald-300 mt-3 bg-slate-950/85 px-3.5 py-1 rounded-full border border-emerald-500/30 shadow-md">
                      Point at Barcode or QR Code
                    </span>
                  )}
                </div>
              )}

              {/* Inactive Camera State */}
              {!cameraActive && !scanResult && (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  {cameraError ? (
                    <p className="text-xs text-rose-400 max-w-xs">{cameraError}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Camera ready. Click below to start scanning.</p>
                  )}
                  {cameras.length > 0 && (
                    <button
                      onClick={() => startCamera(selectedCameraId || cameras[0].id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
                    >
                      Start Live Camera
                    </button>
                  )}
                </div>
              )}

              {/* CONTINUOUS MODE FLOATING BANNER */}
              {scanBehavior === 'continuous_cooldown' && scanResult && (
                <div className="absolute top-3 left-3 right-3 bg-slate-900/95 border border-emerald-500/80 rounded-xl p-2.5 shadow-2xl flex items-center justify-between text-xs animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white text-xs">{scanResult.type === 'SUCCESS' ? scanResult.item.name : scanResult.type === 'DUPLICATE' ? `${scanResult.item.name} (Duplicate)` : 'Scanned'}</p>
                      <p className="text-[10px] text-emerald-300 font-mono">Added 1 unit &bull; Cart Total: {cart.reduce((sum, c) => sum + c.quantity, 0)} items</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScanResult(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* OVERLAY: DUPLICATE ITEM CONFIRMATION (SINGLE REVIEW MODE) */}
              {scanBehavior === 'single_review' && scanResult && scanResult.type === 'DUPLICATE' && (
                <div className="absolute inset-2 bg-slate-900/95 border border-amber-400/80 rounded-xl p-4 flex flex-col justify-between text-slate-100 shadow-2xl animate-in zoom-in-95">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm text-amber-300">Duplicate Scan Blocked!</h4>
                        <p className="text-[11px] text-amber-400/90">This item is already in your active cart.</p>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-white text-sm leading-tight">{scanResult.item.name}</p>
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(scanResult.item.sellingPrice, settings.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>SKU: {scanResult.item.sku}</span>
                        <span>Stock: {scanResult.item.stock}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-amber-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5" /> Already in Cart:
                        </span>
                        <span className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                          {scanResult.currentQty} unit{scanResult.currentQty !== 1 ? 's' : ''} ({formatCurrency(scanResult.item.sellingPrice * scanResult.currentQty, settings.currencySymbol)})
                        </span>
                      </div>
                    </div>

                    {scanResult.added && (
                      <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Added +1 copy successfully! Total now: {scanResult.currentQty}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmDuplicateAdd}
                        disabled={scanResult.currentQty >= scanResult.item.stock}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add +1 ({scanResult.currentQty + 1})</span>
                      </button>

                      <button
                        type="button"
                        onClick={resumeNextScan}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <span>Scan Next Item</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OVERLAY: SUCCESSFUL SINGLE ITEM SCAN (SINGLE REVIEW MODE) */}
              {scanBehavior === 'single_review' && scanResult && scanResult.type === 'SUCCESS' && (
                <div className="absolute inset-2 bg-slate-900/95 border border-emerald-500/80 rounded-xl p-4 flex flex-col justify-between text-slate-100 shadow-2xl animate-in zoom-in-95">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm text-emerald-300">Added Exactly 1 Item</h4>
                        <p className="text-[11px] text-emerald-400/90">Camera frozen to prevent multi-scanning</p>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-white text-sm leading-tight">{scanResult.item.name}</p>
                        <span className="font-bold text-emerald-400 text-sm">
                          {formatCurrency(scanResult.item.sellingPrice, settings.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
                        <span>SKU: {scanResult.item.sku}</span>
                        <span>Barcode: {scanResult.item.barcode}</span>
                        <span className="text-slate-300">Stock: {scanResult.item.stock}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setIsScannerModalOpen(false);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Done / View Cart
                    </button>
                    <button
                      type="button"
                      onClick={resumeNextScan}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <span>Scan Next Item</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* OVERLAY: NOT FOUND BARCODE */}
              {scanBehavior === 'single_review' && scanResult && scanResult.type === 'NOT_FOUND' && (
                <div className="absolute inset-2 bg-slate-900/95 border border-rose-500/80 rounded-xl p-4 flex flex-col justify-between text-slate-100 shadow-2xl animate-in zoom-in-95">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-400">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm text-rose-300">Barcode / QR Not In Database</h4>
                        <p className="text-[11px] text-rose-400/90">No matching product found</p>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800 text-xs font-mono text-slate-300">
                      Decoded: <span className="text-rose-300 font-bold break-all">{scanResult.barcode}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={resumeNextScan}
                      className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Try Scanning Again</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* File Upload Mode */
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-8 text-center bg-slate-950/40 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScanImageFile}
                className="hidden"
                id="qr-file-upload-input"
              />
              <label
                htmlFor="qr-file-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    {isFileScanning ? 'Decoding QR image...' : 'Click to Upload QR or Barcode Image'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Select a photo, screenshot, or downloaded QR voucher
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs">
                  Choose Image File
                </span>
              </label>
            </div>
          )}

          {/* Camera Selector */}
          {activeScanMode === 'camera' && cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 shrink-0">Camera Lens:</label>
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual Keyboard Entry */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-emerald-400" /> Manual Barcode / SKU / QR Text Input
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Single-scan verified</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 8901234567890, PEN-1213, or QR string..."
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-emerald-900/30 transition-colors shrink-0 cursor-pointer"
              >
                Scan Item
              </button>
            </div>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Quick Test Catalog Items:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {(items || []).slice(0, 8).map((item) => {
                const inCart = cart.find(c => c.item.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => processScannedCode(item.barcode)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors flex items-center gap-1.5 text-left border cursor-pointer ${
                      inCart 
                        ? 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/60'
                        : 'bg-slate-800 hover:bg-emerald-950 hover:border-emerald-600 text-slate-300 hover:text-emerald-300 border-slate-700/60'
                    }`}
                  >
                    <span className="truncate max-w-[120px] font-sans">{item.name}</span>
                    {inCart && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded">
                        {inCart.quantity} in cart
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <strong className="text-emerald-400">Multi-Format Engine</strong> (QR, EAN-13, Code-128, UPC, DataMatrix)
          </span>
          <button
            onClick={() => {
              stopCamera();
              setIsScannerModalOpen(false);
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
