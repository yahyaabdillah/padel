"use client";

// PadelHub — real, scannable QR code. Renders `text` to a canvas via the
// `qrcode` library. Used for the member booking-token QR and the static staff
// QR. Unlike the legacy StaticQrCode (a faux visual), this is decodable.

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface RealQrCodeProps {
  text: string;
  size?: number;
  className?: string;
}

const RealQrCode: React.FC<RealQrCodeProps> = ({ text, size = 220, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0E1116", light: "#FFFFFF" },
    })
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err: unknown) => {
        console.error("[RealQrCode] render error:", err);
        if (!cancelled) setError("Gagal membuat QR");
      });
    return () => {
      cancelled = true;
    };
  }, [text, size]);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 ${className}`}
      style={{ width: size + 24, height: size + 24 }}
    >
      {error ? (
        <span className="px-4 text-center text-xs text-rose-500">{error}</span>
      ) : (
        <canvas ref={canvasRef} aria-label="QR check-in" role="img" />
      )}
    </div>
  );
};

export default RealQrCode;
