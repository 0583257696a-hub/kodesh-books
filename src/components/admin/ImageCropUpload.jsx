import React, { useEffect, useRef, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const MAX_STAGE_WIDTH = 720;
const MAX_STAGE_HEIGHT = 420;
const MIN_CROP_SIZE = 48;

function fitSize(width, height) {
  const scale = Math.min(MAX_STAGE_WIDTH / width, MAX_STAGE_HEIGHT / height, 1);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function centeredCrop(width, height, aspectRatio) {
  let cropWidth = width * 0.82;
  let cropHeight = height * 0.82;

  if (aspectRatio) {
    if (cropWidth / cropHeight > aspectRatio) {
      cropWidth = cropHeight * aspectRatio;
    } else {
      cropHeight = cropWidth / aspectRatio;
    }
  }

  return {
    x: Math.round((width - cropWidth) / 2),
    y: Math.round((height - cropHeight) / 2),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

function clampCrop(nextCrop, stage, aspectRatio) {
  let width = Math.max(MIN_CROP_SIZE, nextCrop.width);
  let height = Math.max(MIN_CROP_SIZE, nextCrop.height);

  if (aspectRatio) {
    height = width / aspectRatio;
    if (height > stage.height) {
      height = stage.height;
      width = height * aspectRatio;
    }
    if (width > stage.width) {
      width = stage.width;
      height = width / aspectRatio;
    }
  } else {
    width = Math.min(width, stage.width);
    height = Math.min(height, stage.height);
  }

  const x = Math.min(Math.max(0, nextCrop.x), Math.max(0, stage.width - width));
  const y = Math.min(Math.max(0, nextCrop.y), Math.max(0, stage.height - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

async function cropFile(file, imageUrl, naturalSize, stageSize, crop) {
  const image = new window.Image();
  image.src = imageUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const scaleX = naturalSize.width / stageSize.width;
  const scaleY = naturalSize.height / stageSize.height;
  const sourceX = crop.x * scaleX;
  const sourceY = crop.y * scaleY;
  const sourceWidth = crop.width * scaleX;
  const sourceHeight = crop.height * scaleY;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth));
  canvas.height = Math.max(1, Math.round(sourceHeight));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
  const extension = type === 'image/png' ? 'png' : 'jpg';
  const safeName = file.name.replace(/\.[^.]+$/, '') || 'cropped-image';
  return new File([blob], `${safeName}-cropped.${extension}`, { type });
}

export default function ImageCropUpload({
  label,
  value,
  onChange,
  aspectRatio,
  previewClassName = 'mt-2 h-24 w-24 rounded-lg border border-slate-200 object-cover',
  buttonText = 'העלאת תמונה',
  helperText = 'בחר קובץ, קבע את גבולות החיתוך ואז שמור את התמונה.',
  multiple = false,
}) {
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (activeFile) return;
    const [nextFile, ...rest] = queue;
    if (!nextFile) return;

    const objectUrl = URL.createObjectURL(nextFile);
    const image = new window.Image();
    image.onload = () => {
      const nextStageSize = fitSize(image.naturalWidth, image.naturalHeight);
      setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
      setStageSize(nextStageSize);
      setCrop(centeredCrop(nextStageSize.width, nextStageSize.height, aspectRatio));
      setImageUrl(objectUrl);
      setActiveFile(nextFile);
      setQueue(rest);
    };
    image.src = objectUrl;

  }, [activeFile, aspectRatio, queue]);

  const resetActive = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setActiveFile(null);
    setImageUrl('');
    setNaturalSize({ width: 0, height: 0 });
    setStageSize({ width: 0, height: 0 });
    setCrop(null);
    setUploading(false);
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) setQueue(files);
    event.target.value = '';
  };

  const startPointer = (event, mode) => {
    if (!crop) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      crop,
    };
  };

  const movePointer = (event) => {
    const drag = dragRef.current;
    if (!drag || !crop) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const base = drag.crop;
    let nextCrop = base;

    if (drag.mode === 'move') {
      nextCrop = { ...base, x: base.x + dx, y: base.y + dy };
    } else if (drag.mode === 'se') {
      nextCrop = { ...base, width: base.width + dx, height: base.height + dy };
    } else if (drag.mode === 'sw') {
      nextCrop = { x: base.x + dx, y: base.y, width: base.width - dx, height: base.height + dy };
    } else if (drag.mode === 'ne') {
      nextCrop = { x: base.x, y: base.y + dy, width: base.width + dx, height: base.height - dy };
    } else if (drag.mode === 'nw') {
      nextCrop = { x: base.x + dx, y: base.y + dy, width: base.width - dx, height: base.height - dy };
    }

    setCrop(clampCrop(nextCrop, stageSize, aspectRatio));
  };

  const endPointer = () => {
    dragRef.current = null;
  };

  const saveCrop = async () => {
    if (!activeFile || !crop) return;
    setUploading(true);
    try {
      const croppedFile = await cropFile(activeFile, imageUrl, naturalSize, stageSize, crop);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: croppedFile });
      onChange(file_url);
      resetActive();
    } finally {
      setUploading(false);
    }
  };

  const open = Boolean(activeFile && imageUrl && crop);

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm text-slate-700">{label}</Label>}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <UploadCloud className="ml-2 h-4 w-4" />
          {buttonText}
        </Button>
        <p className="text-xs text-slate-500">{helperText}</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={handleFiles} />
      {value && !multiple && <img src={value} alt={label || 'תמונה'} className={previewClassName} />}

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && resetActive()}>
        <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto border-slate-200 bg-white text-slate-950" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">תצוגה מקדימה וחיתוך תמונה</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              גרור את המסגרת כדי לבחור את האזור שיופיע באתר. אפשר להזיז את הפינות כדי לקבוע את גבולות הגזרה.
            </p>

            <div className="flex justify-center overflow-auto rounded-lg bg-slate-100 p-3">
              <div
                className="relative select-none overflow-hidden"
                style={{ width: stageSize.width, height: stageSize.height }}
                onPointerMove={movePointer}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
              >
                <img src={imageUrl} alt="תצוגה מקדימה" className="block h-full w-full object-contain" draggable={false} />
                <div className="absolute inset-0 bg-black/45" />
                {crop && (
                  <div
                    className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]"
                    style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
                    onPointerDown={(event) => startPointer(event, 'move')}
                  >
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <span key={index} className="border border-white/25" />
                      ))}
                    </div>
                    {[
                      ['nw', '-right-2 -top-2 cursor-nwse-resize'],
                      ['ne', '-left-2 -top-2 cursor-nesw-resize'],
                      ['sw', '-right-2 -bottom-2 cursor-nesw-resize'],
                      ['se', '-left-2 -bottom-2 cursor-nwse-resize'],
                    ].map(([mode, className]) => (
                      <button
                        key={mode}
                        type="button"
                        aria-label="שינוי גבול חיתוך"
                        className={`absolute h-5 w-5 rounded-full border-2 border-white bg-blue-600 ${className}`}
                        onPointerDown={(event) => startPointer(event, mode)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-3">
              <Button type="button" variant="outline" onClick={resetActive} className="border-slate-200 text-slate-700">
                <X className="ml-2 h-4 w-4" />
                ביטול
              </Button>
              <Button type="button" onClick={saveCrop} disabled={uploading} className="bg-blue-600 text-white hover:bg-blue-700">
                {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UploadCloud className="ml-2 h-4 w-4" />}
                שמור תמונה חתוכה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
