"use client";

// PadelHub — image crop modal. Wraps ImageCropper in a ModalDialog with
// Cancel / Crop actions. Open this whenever an uploaded image needs to be
// constrained to a fixed aspect ratio before use.

import React, { useCallback, useRef } from "react";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import ImageCropper, { type CropResult } from "./ImageCropper";

interface ImageCropperModalProps {
  isOpen: boolean;
  /** source image (object URL / data URL) to crop */
  src: string | null;
  /** target aspect ratio (width / height) */
  aspect: number;
  outputWidth?: number;
  mimeType?: "image/jpeg" | "image/png";
  quality?: number;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onCancel: () => void;
  /** receives the cropped image data URL */
  onConfirm: (result: CropResult) => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  src,
  aspect,
  outputWidth = 1280,
  mimeType = "image/jpeg",
  quality = 0.9,
  title = "Sesuaikan Gambar",
  description = "Atur posisi & zoom agar gambar sesuai rasio yang dibutuhkan.",
  confirmLabel = "Pakai Gambar",
  onCancel,
  onConfirm,
}) => {
  const getCropRef = useRef<(() => CropResult | null) | null>(null);

  const handleReady = useCallback((getCrop: () => CropResult | null) => {
    getCropRef.current = getCrop;
  }, []);

  const handleConfirm = () => {
    const result = getCropRef.current?.();
    if (result) onConfirm(result);
  };

  return (
    <ModalDialog
      isOpen={isOpen && !!src}
      onClose={onCancel}
      title={title}
      description={description}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button variant="primary" sheen onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {src && (
        <ImageCropper
          src={src}
          aspect={aspect}
          outputWidth={outputWidth}
          mimeType={mimeType}
          quality={quality}
          onReady={handleReady}
        />
      )}
    </ModalDialog>
  );
};

export default ImageCropperModal;
