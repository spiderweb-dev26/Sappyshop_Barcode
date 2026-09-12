import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  Trash2, 
  Check, 
  AlertCircle,
  Eye,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { compressAndResizeImage, STATIONERY_PRESET_IMAGES, StationeryPresetImage, getStationeryFallbackSvg } from '../utils/imageUtils';

interface ItemImageUploaderProps {
  value?: string;
  onChange: (imageUrl: string | undefined) => void;
  itemName?: string;
  itemCategory?: string;
  compact?: boolean;
}

export const ItemImageUploader: React.FC<ItemImageUploaderProps> = ({
  value,
  onChange,
  itemName = 'Product',
  itemCategory = 'Stationery',
  compact = false
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'presets' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP, or SVG).');
      return;
    }

    setIsProcessing(true);
    try {
      const { dataUrl, sizeKb } = await compressAndResizeImage(file, 500, 500, 0.85);
      setImageSizeKb(sizeKb);
      onChange(dataUrl);
    } catch (err) {
      console.error('Image compression failed:', err);
      // Fallback: standard file reader
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          onChange(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    const clean = urlInput.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:')) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    onChange(clean);
  };

  const handleSelectPreset = (preset: StationeryPresetImage) => {
    onChange(preset.url);
  };

  const handleRemove = () => {
    onChange(undefined);
    setUrlInput('');
    setImageSizeKb(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Product Item Photo / Image</span>
        </label>
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>

      {/* When an image is already set */}
      {value ? (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3.5">
          <div className="relative group shrink-0 w-24 h-24 sm:w-20 sm:h-20 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-xs">
            <img 
              src={value} 
              alt={itemName} 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getStationeryFallbackSvg(itemCategory, itemName);
              }}
              className="w-full h-full object-contain p-1"
            />
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300">
                <Check className="w-2.5 h-2.5" /> Image Attached
              </span>
              {imageSizeKb ? (
                <span className="text-[10px] text-slate-500 font-mono">
                  Optimized: {imageSizeKb} KB
                </span>
              ) : value.startsWith('data:') ? (
                <span className="text-[10px] text-slate-500 font-mono">Local Photo</span>
              ) : (
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">Web Catalog</span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate">{itemName}</p>
            <p className="text-[11px] text-slate-400">
              Visible on POS tiles, cashier orders & inventory stock cards.
            </p>
          </div>

          <div className="flex sm:flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        /* When no image is set yet, show interactive selector */
        <div className="p-3.5 bg-slate-50/75 rounded-2xl border border-slate-200/90 space-y-3">
          {/* Modes selector */}
          <div className="flex bg-slate-200/70 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMode('upload')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'upload' 
                  ? 'bg-white text-slate-900 shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Upload / Camera</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('presets')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'presets' 
                  ? 'bg-white text-slate-900 shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Presets Library</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('url')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'url' 
                  ? 'bg-white text-slate-900 shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Web Link</span>
            </button>
          </div>

          {/* Mode 1: Upload File & Camera */}
          {activeMode === 'upload' && (
            <div className="space-y-2">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  dragOver 
                    ? 'border-emerald-500 bg-emerald-50/50' 
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-100/50 bg-white'
                }`}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <input 
                  ref={cameraInputRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFileChange}
                />

                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {isProcessing ? 'Optimizing photo...' : 'Click to select photo or drag and drop'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    JPG, PNG, WEBP • Auto-compressed for fast POS loading
                  </p>
                </div>
              </div>

              {/* Quick camera button for mobile / tablet checkout terminals */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Take Photo with Camera</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Presets Library */}
          {activeMode === 'presets' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                Choose a high-definition stationery photo matching this product:
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {STATIONERY_PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left flex flex-col items-center gap-1 transition-all group"
                  >
                    <div className="w-full h-14 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                      <img 
                        src={preset.url} 
                        alt={preset.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 truncate w-full text-center group-hover:text-emerald-800">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 3: Web Link / URL */}
          {activeMode === 'url' && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Paste Image Link / Web Address
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlError(false);
                  }}
                  placeholder="https://example.com/item-image.jpg"
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0 shadow-2xs"
                >
                  Apply
                </button>
              </div>
              {urlError && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Please enter a valid image web URL starting with https://
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
