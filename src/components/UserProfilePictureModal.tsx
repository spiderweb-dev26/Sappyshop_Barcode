import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { 
  X, 
  Upload, 
  Camera, 
  Sparkles, 
  Trash2, 
  Check, 
  Link as LinkIcon, 
  RefreshCw, 
  AlertCircle,
  User as UserIcon,
  ShieldCheck,
  SwitchCamera
} from 'lucide-react';
import { 
  STAFF_AVATAR_PRESETS, 
  AvatarPreset, 
  compressAndResizeAvatar 
} from '../utils/avatarUtils';

interface UserProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
}

export const UserProfilePictureModal: React.FC<UserProfilePictureModalProps> = ({
  isOpen,
  onClose,
  targetUser
}) => {
  const { currentUser, updateUserAvatar, updateUserProfile, addToast, settings } = useApp();
  
  // Resolve user to edit: either targetUser or active currentUser
  const user = targetUser || currentUser;

  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets' | 'url'>('upload');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar);
  const [selectedColor, setSelectedColor] = useState<string>(user?.avatarColor || 'bg-emerald-700');
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlError, setUrlError] = useState<boolean>(false);

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when user changes
  useEffect(() => {
    if (isOpen && user) {
      setAvatarPreview(user.avatar);
      setSelectedColor(user.avatarColor || 'bg-emerald-700');
      setImageSizeKb(null);
      setUrlInput(user.avatar?.startsWith('http') ? user.avatar : '');
    }
  }, [isOpen, user]);

  // Clean up camera on close or tab switch
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen || !user) return null;

  // Process File Upload
  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('error', 'Invalid File Type', 'Please upload an image file (PNG, JPG, JPEG, or WEBP).');
      return;
    }

    setIsProcessing(true);
    try {
      const { dataUrl, sizeKb } = await compressAndResizeAvatar(file, 256, 0.82);
      setAvatarPreview(dataUrl);
      setImageSizeKb(sizeKb);
      setUrlError(false);
    } catch (err) {
      console.error('Avatar processing error:', err);
      // Fallback
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          setAvatarPreview(e.target.result);
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

  // Start Camera
  const startCamera = async (facingMode: 'user' | 'environment' = cameraFacing) => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access unavailable. Please check browser permissions or upload an image file.');
      setIsCameraActive(false);
    }
  };

  // Capture Snapshot from Camera
  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 320, video.videoHeight || 320);
    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const sx = Math.max(0, ((video.videoWidth || size) - size) / 2);
    const sy = Math.max(0, ((video.videoHeight || size) - size) / 2);

    ctx.drawImage(video, sx, sy, size, size, 0, 0, 256, 256);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

    setAvatarPreview(dataUrl);
    setImageSizeKb(sizeKb);
    stopCamera();
    setActiveTab('upload');
    addToast('success', 'Photo Captured', 'Snapshot ready! Click "Save Profile Picture" to confirm.');
  };

  const handleApplyPreset = (preset: AvatarPreset) => {
    setAvatarPreview(preset.url);
    setImageSizeKb(null);
    setUrlError(false);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput.trim());
      setAvatarPreview(urlInput.trim());
      setUrlError(false);
    } catch {
      setUrlError(true);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(undefined);
    setImageSizeKb(null);
    setUrlInput('');
  };

  const handleSave = () => {
    updateUserProfile(user.id, {
      avatar: avatarPreview,
      avatarColor: selectedColor
    });
    stopCamera();
    onClose();
  };

  const colorOptions = [
    'bg-emerald-700',
    'bg-teal-700',
    'bg-green-600',
    'bg-slate-700',
    'bg-blue-700',
    'bg-indigo-700',
    'bg-purple-700',
    'bg-amber-700',
    'bg-rose-700'
  ];

  const initials = (user.name || 'Staff')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-emerald-100 w-full max-w-lg overflow-hidden text-slate-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 bg-[#064e3b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-emerald-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Profile Picture & Staff Avatar</span>
                {user.id === currentUser?.id && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Your Profile
                  </span>
                )}
              </h3>
              <p className="text-xs text-emerald-200/90">
                Update account avatar for {user.name} ({user.role})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card & Active Avatar Preview Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Live Large Avatar Preview */}
            <div className="relative shrink-0">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${selectedColor} text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md border-3 border-white ring-2 ring-emerald-600/30 overflow-hidden`}>
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      addToast('warning', 'Image Error', 'Failed to load avatar image. Reverting to initials.');
                      setAvatarPreview(undefined);
                    }}
                  />
                ) : (
                  <span>{initials || 'ST'}</span>
                )}
              </div>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors border-2 border-white"
                  title="Remove custom photo and reset to initials"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-slate-900 truncate">{user.name}</h4>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase border border-emerald-200">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {imageSizeKb ? (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Optimized: ~{imageSizeKb} KB
                  </span>
                ) : avatarPreview ? (
                  <span className="text-[10px] text-slate-600 font-medium">Custom Photo Set</span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">Using Vector Initials</span>
                )}
              </div>
            </div>
          </div>

          {/* Initials Color Picker (Shown when no custom photo or to set fallback background) */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-semibold mb-1">Badge Color</span>
            <div className="flex items-center gap-1">
              {colorOptions.slice(0, 5).map(colorClass => (
                <button
                  key={colorClass}
                  type="button"
                  onClick={() => setSelectedColor(colorClass)}
                  className={`w-5 h-5 rounded-full ${colorClass} border-2 transition-transform ${
                    selectedColor === colorClass ? 'scale-125 border-slate-900 ring-2 ring-emerald-500/50' : 'border-white'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 text-xs font-semibold px-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 rounded-t-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'bg-white text-emerald-900 border-t-2 border-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`px-3 py-2 rounded-t-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'camera'
                ? 'bg-white text-emerald-900 border-t-2 border-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Take Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 rounded-t-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'presets'
                ? 'bg-white text-emerald-900 border-t-2 border-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Staff Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-2 rounded-t-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'url'
                ? 'bg-white text-emerald-900 border-t-2 border-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 min-h-[220px]">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/30'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2 shadow-xs">
                  {isProcessing ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <h5 className="font-bold text-xs text-slate-800">
                  {isProcessing ? 'Optimizing image...' : 'Click to browse or drag & drop image here'}
                </h5>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Supports PNG, JPG, JPEG, and WebP. Automatically center-cropped and compressed to a fast, lightweight badge.
                </p>
                <button
                  type="button"
                  className="mt-3 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Choose Picture
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WEBCAM CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                  <p className="text-xs text-rose-800 font-semibold">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl bg-black overflow-hidden shadow-inner flex items-center justify-center border-2 border-emerald-600">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Circular Face Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-44 rounded-full border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                    </div>

                    {/* Camera Switch button for mobile */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
                        setCameraFacing(nextFacing);
                        startCamera(nextFacing);
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
                      title="Switch front/back camera"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={captureCameraSnapshot}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Snapshot</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium"
                    >
                      Stop Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CURATED PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Select a curated professional staff portrait or stationery vector avatar badge:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {STAFF_AVATAR_PRESETS.map((preset) => {
                  const isSelected = avatarPreview === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 relative ${
                        isSelected 
                          ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/40 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-full overflow-hidden shadow-xs border border-slate-200 bg-slate-100 flex items-center justify-center">
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[10px] font-bold text-slate-800 truncate">{preset.name}</p>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">{preset.roleHint}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: WEB URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Public Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlError(false);
                    }}
                    placeholder="https://example.com/photo.jpg"
                    className={`flex-1 h-9 px-3 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      urlError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-emerald-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3.5 h-9 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shrink-0"
                  >
                    Apply URL
                  </button>
                </div>
                {urlError && (
                  <p className="text-[11px] text-rose-600 mt-1">Please enter a valid HTTP or HTTPS image link.</p>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                You can paste direct image links from Unsplash, company sites, or hosted media.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="h-8 px-3 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-rose-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset to Initials</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="h-8 px-3.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-8 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Profile Picture</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
