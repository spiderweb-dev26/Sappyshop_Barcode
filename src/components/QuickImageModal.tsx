import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { ItemImageUploader } from './ItemImageUploader';
import { X, Check, ImageIcon } from 'lucide-react';

interface QuickImageModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveImage: (itemId: string, imageUrl: string | undefined) => void;
}

export const QuickImageModal: React.FC<QuickImageModalProps> = ({
  item,
  isOpen,
  onClose,
  onSaveImage,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(item?.imageUrl);

  // Sync state when item changes
  React.useEffect(() => {
    setSelectedImage(item?.imageUrl);
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    onSaveImage(item.id, selectedImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-sm">Product Item Photo</h3>
              <p className="text-[11px] text-emerald-200 truncate max-w-[260px]">
                {item.name} ({item.sku})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-white/10 rounded transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <ItemImageUploader
            value={selectedImage}
            onChange={setSelectedImage}
            itemName={item.name}
            itemCategory={item.category}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Product Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
