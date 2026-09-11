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
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowRight, 
  ShoppingCart, 
  ShoppingBag,
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
import { getItemDisplayImage } from '../utils/imageUtils';
import { QuickImageModal } from './QuickImageModal';
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
    updateCartQuantity,
    removeFromCart,
    clearCart,
    setActiveTab,
    settings, 
    addToast,
    updateItem
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
  
  // Track most recently scanned item to highlight right below the scanner
  const [lastScannedItemId, setLastScannedItemId] = useState<string | null>(null);
  const [showManualTools, setShowManualTools] = useState<boolean>(false);
  const [imageEditItem, setImageEditItem] = useState<InventoryItem | null>(null);

  // Single-item scan state & duplicate confirmation
  const [scanResult, setScanResult] = useState<ScanFeedback | null>(null);
  const isLockedRef = useRef<boolean>(false);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const cooldownTimerRef = useRef<number | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'interactive-barcode-scanner';

  // Cart summary calculations for scanned items
  const cartTotal = cart.reduce((sum, item) => sum + (item.item.sellingPrice * item.quantity), 0);
  const cartTotalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleIncrementCart = (item: InventoryItem) => {
    const current = cart.find(c => c.item.id === item.id);
    const currentQty = current ? current.quantity : 0;
    if (currentQty >= item.stock) {
      addToast('warning', 'Max Stock Limit', `Cannot exceed ${item.stock} available units for ${item.name}.`);
      return;
    }
    updateCartQuantity(item.id, currentQty + 1);
    triggerHaptic('success');
    soundEffects.playScanSuccess();
  };

  const handleDecrementCart = (item: InventoryItem) => {
    const current = cart.find(c => c.item.id === item.id);
    if (!current) return;
    if (current.quantity > 1) {
      updateCartQuantity(item.id, current.quantity - 1);
      triggerHaptic('warning');
    } else {
      removeFromCart(item.id);
      addToast('info', 'Item Removed', `Removed ${item.name} from cart.`);
      if (lastScannedItemId === item.id) {
        setLastScannedItemId(null);
      }
    }
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    removeFromCart(itemId);
    addToast('info', 'Item Removed', `Removed ${itemName} from cart.`);
    if (lastScannedItemId === itemId) {
      setLastScannedItemId(null);
    }
  };

  const handleGoToCheckout = () => {
    stopCamera();
    setIsScannerModalOpen(false);
    setActiveTab('checkout');
    addToast('success', 'Proceeding to Checkout', `${cartTotalUnits} item${cartTotalUnits !== 1 ? 's' : ''} loaded into Checkout.`);
  };

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

    setLastScannedItemId(matchedItem.id);

    // Check if item is already in active cart
    const existingInCart = cart.find(c => c.item.id === matchedItem.id);

    if (existingInCart) {
      if (scanBehavior === 'continuous_cooldown') {
        if (existingInCart.quantity < matchedItem.stock) {
          triggerHaptic('success');
          soundEffects.playScanSuccess();
          addToCart(matchedItem, 1);
          setScanResult({
            type: 'SUCCESS',
            item: matchedItem,
            qty: existingInCart.quantity + 1,
            rawCode: extractedCode
          });
        } else {
          triggerHaptic('warning');
          soundEffects.playWarning();
          addToast('warning', 'Max Stock Limit', `All ${matchedItem.stock} available units of ${matchedItem.name} are in cart.`);
          setScanResult({
            type: 'DUPLICATE',
            item: matchedItem,
            currentQty: existingInCart.quantity,
            added: false,
            rawCode: extractedCode
          });
        }
      } else {
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
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        
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
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          
          {/* CAMERA VIEWFINDER (Compact & non-intrusive) */}
          {activeScanMode === 'camera' ? (
            <div className="relative bg-black rounded-xl overflow-hidden border border-slate-800 h-48 sm:h-56 w-full flex flex-col items-center justify-center shadow-inner shrink-0">
              <div id={scannerContainerId} className="w-full h-full object-cover" />
              
              {/* Camera Paused Indicator (Single Review Mode) */}
              {scanBehavior === 'single_review' && scanResult && (
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5 shadow-lg z-20 pointer-events-none whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Camera Paused &bull; Scanned Item Listed Below</span>
                </div>
              )}

              {/* Active Viewfinder Overlay (When Idle Scanning) */}
              {cameraActive && !isCameraPaused && !scanResult && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-48 h-40 sm:w-56 sm:h-44 border-2 border-emerald-400/90 rounded-2xl relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.35)]">
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
                    <span className="text-[10px] font-mono text-amber-300 mt-2 bg-amber-950/90 px-3 py-0.5 rounded-full border border-amber-500/40 shadow-md animate-pulse">
                      Anti-repeat cooldown: {cooldownRemaining}s
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-300 mt-2 bg-slate-950/85 px-3 py-0.5 rounded-full border border-emerald-500/30 shadow-md">
                      Point camera at Barcode or QR Code
                    </span>
                  )}
                </div>
              )}

              {/* Inactive Camera State */}
              {!cameraActive && (
                <div className="p-4 text-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Camera className="w-5 h-5" />
                  </div>
                  {cameraError ? (
                    <p className="text-xs text-rose-400 max-w-xs">{cameraError}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Camera ready. Tap below to start scanning.</p>
                  )}
                  {cameras.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startCamera(selectedCameraId || cameras[0].id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
                    >
                      Start Live Camera
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* File Upload Mode */
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 text-center bg-slate-950/40 transition-colors">
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
                className="cursor-pointer flex flex-col items-center justify-center space-y-2.5"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">
                    {isFileScanning ? 'Decoding QR image...' : 'Click to Upload Barcode / QR Image'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select a photo or screenshot from your mobile gallery
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs">
                  Choose Image File
                </span>
              </label>
            </div>
          )}

          {/* ========================================================= */}
          {/* ITEM RIGHT BELOW SCANNER: MOST RECENT SCAN ACTION CARD */}
          {/* ========================================================= */}
          {scanResult && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              {scanResult.type === 'SUCCESS' && (
                <div className="bg-emerald-950/50 border-2 border-emerald-500/70 rounded-xl p-3 sm:p-3.5 text-slate-100 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Scanned &amp; Added to Cart
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Just Scanned
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-emerald-500/30">
                    {/* Scanned Product Photo */}
                    {(() => {
                      const displayImg = getItemDisplayImage(scanResult.item);
                      const isCustom = Boolean(scanResult.item.imageUrl && scanResult.item.imageUrl.trim().length > 0);
                      return (
                        <div className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-xl bg-slate-950 border-2 border-emerald-500/70 shrink-0 overflow-hidden flex items-center justify-center shadow-lg group/img">
                          <img
                            src={displayImg}
                            alt={scanResult.item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setImageEditItem(scanResult.item)}
                            className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 cursor-pointer"
                            title="Upload or snap photo for this item"
                          >
                            <Camera className="w-4 h-4 text-emerald-400 mb-0.5" />
                            <span>{isCustom ? 'Change Photo' : 'Upload Photo'}</span>
                          </button>
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-emerald-300 text-[8px] font-bold text-center py-0.5 uppercase tracking-wider border-t border-emerald-500/30">
                            {isCustom ? 'Custom Photo' : 'Photo'}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {scanResult.item.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          SKU: {scanResult.item.sku}
                        </span>
                        <button
                          type="button"
                          onClick={() => setImageEditItem(scanResult.item)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2 ml-auto cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{scanResult.item.imageUrl ? 'Edit Photo' : 'Add Photo'}</span>
                        </button>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-white truncate mt-1">
                        {scanResult.item.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                        <span className="text-emerald-400 font-bold">
                          {formatCurrency(scanResult.item.sellingPrice, settings.currencySymbol)}/ea
                        </span>
                        <span>&bull;</span>
                        <span className="text-slate-400">
                          Stock: {scanResult.item.stock}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base sm:text-lg font-black text-emerald-400 font-mono block">
                        {formatCurrency(
                          scanResult.item.sellingPrice * (cart.find(c => c.item.id === scanResult.item.id)?.quantity || 1),
                          settings.currencySymbol
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">Line Subtotal</span>
                    </div>
                  </div>

                  {/* Quantity Stepper right on Scanned Item */}
                  <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" /> Quantity in Cart:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecrementCart(scanResult.item)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-emerald-300 font-mono">
                        {cart.find(c => c.item.id === scanResult.item.id)?.quantity || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleIncrementCart(scanResult.item)}
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center font-bold transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scan Next / Checkout Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={resumeNextScan}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan Next Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGoToCheckout}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Checkout ({cartTotalUnits})</span>
                    </button>
                  </div>
                </div>
              )}

              {scanResult.type === 'DUPLICATE' && (
                <div className="bg-amber-950/50 border-2 border-amber-500/70 rounded-xl p-3 sm:p-3.5 text-slate-100 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Duplicate Item Detected
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Already in Cart
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-amber-500/30">
                    {/* Duplicate Scanned Product Photo */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-950 border-2 border-amber-500/60 shrink-0 overflow-hidden flex items-center justify-center shadow-lg group/img">
                      <img
                        src={getItemDisplayImage(scanResult.item)}
                        alt={scanResult.item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setImageEditItem(scanResult.item)}
                        className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold p-1 cursor-pointer"
                        title="Upload or snap photo"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                        <span>Photo</span>
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-amber-300 font-mono">
                          SKU: {scanResult.item.sku}
                        </span>
                        <button
                          type="button"
                          onClick={() => setImageEditItem(scanResult.item)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Photo</span>
                        </button>
                      </div>
                      <h4 className="font-bold text-sm text-white truncate mt-0.5">
                        {scanResult.item.name}
                      </h4>
                      <p className="text-xs text-amber-300/90 mt-0.5">
                        Already has <strong>{scanResult.currentQty} unit{scanResult.currentQty !== 1 ? 's' : ''}</strong> in cart ({formatCurrency(scanResult.item.sellingPrice * scanResult.currentQty, settings.currencySymbol)}).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleConfirmDuplicateAdd}
                      disabled={scanResult.currentQty >= scanResult.item.stock}
                      className="py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add +1 ({scanResult.currentQty + 1})</span>
                    </button>
                    <button
                      type="button"
                      onClick={resumeNextScan}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Keep {scanResult.currentQty} &amp; Scan Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {scanResult.type === 'NOT_FOUND' && (
                <div className="bg-rose-950/50 border-2 border-rose-500/70 rounded-xl p-3 sm:p-3.5 text-slate-100 shadow-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-rose-300">Barcode Not In Catalog</h4>
                      <p className="text-[11px] text-rose-400/90">No matching product found in stationery inventory</p>
                    </div>
                  </div>
                  <p className="text-xs font-mono bg-slate-950/80 p-2 rounded border border-slate-800 text-slate-300 break-all">
                    Decoded: <span className="text-rose-300 font-bold">{scanResult.barcode}</span>
                  </p>
                  <button
                    type="button"
                    onClick={resumeNextScan}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resume Camera &amp; Try Again</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SCANNED ITEMS LIST (LIVE CART RIGHT BELOW SCANNER) */}
          {/* ========================================================= */}
          <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <span>Scanned Items in Cart</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {cart.length} item{cart.length !== 1 ? 's' : ''} ({cartTotalUnits} units)
                  </span>
                </h4>
              </div>
              
              <div className="text-right">
                <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono">
                  {formatCurrency(cartTotal, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Items List */}
            {cart.length === 0 ? (
              <div className="py-5 px-3 text-center space-y-1.5 text-slate-400">
                <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <BarcodeIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-300">No items scanned yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Scan any barcode or QR code with your camera above. Scanned items will be listed here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 sm:max-h-60 overflow-y-auto pr-1">
                {cart.map(({ item, quantity }) => {
                  const isJustScanned = item.id === lastScannedItemId;
                  const lineTotal = item.sellingPrice * quantity;

                  return (
                    <div
                      key={item.id}
                      className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isJustScanned
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-xs'
                          : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800'
                      }`}
                    >
                      {/* Left: Product Thumbnail & Info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                          <img
                            src={getItemDisplayImage(item)}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-0.5"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs sm:text-sm text-white truncate max-w-[140px] sm:max-w-[200px]">
                              {item.name}
                            </p>
                            {isJustScanned && (
                              <span className="text-[9px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                            <span>{item.sku}</span>
                            <span>&bull;</span>
                            <span className="text-emerald-400 font-semibold">{formatCurrency(item.sellingPrice, settings.currencySymbol)}/ea</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Stepper + Line Total + Remove */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Stepper */}
                        <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDecrementCart(item)}
                            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-white font-mono">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrementCart(item)}
                            className="w-7 h-7 rounded bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="w-14 text-right font-mono font-bold text-xs text-emerald-400">
                          {formatCurrency(lineTotal, settings.currencySymbol)}
                        </span>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id, item.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cart Footer Bar */}
            {cart.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                  <span className="text-xs text-slate-400">
                    Grand Total ({cartTotalUnits} units):
                  </span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {formatCurrency(cartTotal, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear all scanned items from the active cart?')) {
                        clearCart();
                        setLastScannedItemId(null);
                        addToast('info', 'Cart Cleared', 'All scanned items removed.');
                      }
                    }}
                    className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToCheckout}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Go to Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* COLLAPSIBLE SECONDARY TOOLS (Manual Entry, Lens, Demos) */}
          {/* ========================================================= */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowManualTools(prev => !prev)}
              className="w-full py-2 px-3 bg-slate-950/60 hover:bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Manual Code Entry &amp; Camera Settings</span>
              </span>
              {showManualTools ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {showManualTools && (
              <div className="mt-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 animate-in fade-in duration-150">
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
                <form onSubmit={handleManualSubmit} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Manual Barcode / SKU / QR Input</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. 8901234567890, PEN-1213..."
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Add Item
                    </button>
                  </div>
                </form>

                {/* Quick Demo Test Buttons */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Quick Catalog Demo Items:
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <strong className="text-emerald-400">Multi-Format Engine</strong> (QR, EAN-13, Code-128, UPC, DataMatrix)
          </span>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setIsScannerModalOpen(false);
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>

      {/* Quick Image Modal for immediate photo update during scanning */}
      {imageEditItem && (
        <QuickImageModal
          item={imageEditItem}
          isOpen={Boolean(imageEditItem)}
          onClose={() => setImageEditItem(null)}
          onSaveImage={(itemId, newImageUrl) => {
            updateItem(itemId, { imageUrl: newImageUrl });
            if (scanResult && scanResult.item.id === itemId) {
              setScanResult(prev => {
                if (!prev || prev.type === 'NOT_FOUND') return prev;
                return { ...prev, item: { ...prev.item, imageUrl: newImageUrl } };
              });
            }
            addToast('success', 'Product Photo Saved', `Updated image for "${imageEditItem.name}".`);
            setImageEditItem(null);
          }}
        />
      )}
    </div>
  );
};
