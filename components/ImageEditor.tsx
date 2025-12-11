
import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/imageProcessor';
import { X, Check, ZoomIn, RotateCw, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onClose: () => void;
  onSave: (file: Blob) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onClose, onSave }) => {
  const [currentImg, setCurrentImg] = useState(imageSrc);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setCurrentImg(imageSrc);
  }, [imageSrc]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        currentImg,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false }
      );
      if (croppedImage) {
        onSave(croppedImage);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to crop image');
    } finally {
      setIsProcessing(false);
    }
  };

  const rotate90 = () => setRotation((prev) => (prev + 90) % 360);
  const rotate180 = () => setRotation((prev) => (prev + 180) % 360);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full h-full md:w-[600px] md:h-auto md:max-h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
           <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <ImageIcon className="w-5 h-5 text-indigo-500" /> Photo Editor
           </h3>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
             <X className="w-5 h-5" />
           </button>
        </div>

        {/* Crop Area */}
        <div className="relative h-64 md:h-80 w-full bg-gray-900">
          <Cropper
            image={currentImg}
            crop={crop}
            rotation={rotation}
            zoom={zoom}
            aspect={1.2 / 1.4} // Standard passport ratio: 1.2 inch width / 1.4 inch height
            onCropChange={setCrop}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            showGrid={true}
            cropShape="rect"
            style={{ 
               containerStyle: { backgroundColor: '#111' },
               cropAreaStyle: { border: '2px solid white' }
            }}
          />
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6 overflow-y-auto bg-white dark:bg-gray-800">
          
          {/* Sliders */}
          <div className="space-y-4">
             <div className="space-y-1">
               <div className="flex justify-between text-xs font-medium text-gray-500 uppercase tracking-wider">
                 <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
                 <span>{zoom.toFixed(1)}x</span>
               </div>
               <input
                 type="range"
                 value={zoom}
                 min={1}
                 max={3}
                 step={0.1}
                 aria-labelledby="Zoom"
                 onChange={(e) => setZoom(Number(e.target.value))}
                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
               />
             </div>

             <div className="space-y-1">
               <div className="flex justify-between text-xs font-medium text-gray-500 uppercase tracking-wider">
                 <span className="flex items-center gap-1"><RotateCw className="w-3 h-3" /> Rotation</span>
                 <span>{rotation}°</span>
               </div>
               <input
                 type="range"
                 value={rotation}
                 min={0}
                 max={360}
                 step={1}
                 aria-labelledby="Rotation"
                 onChange={(e) => setRotation(Number(e.target.value))}
                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
               />
             </div>
          </div>

          {/* Quick Rotation Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button 
              onClick={rotate90}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              <RotateCw className="w-4 h-4" /> +90°
            </button>
            <button 
              onClick={rotate180}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              <RotateCw className="w-4 h-4" /> +180°
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 z-10">
           <button onClick={onClose} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
             Cancel
           </button>
           <button 
             onClick={handleSave} 
             disabled={isProcessing}
             className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-70"
           >
             {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
             Save & Apply
           </button>
        </div>
      </div>
    </div>
  );
};
