"use client";

// PadelHub — device-camera QR scanner. Wraps html5-qrcode. Calls onDecode with
// the decoded text. Handles camera-permission/availability failure with a
// visible message so the caller can keep a manual fallback usable.
//
// Each effect run mounts its OWN child <div> inside the container and removes it
// entirely on cleanup. This survives React 19 StrictMode's mount→unmount→mount
// cycle without leaving a stray second <video> behind (the "double camera" bug):
// even if start() resolves after cleanup, we stop and then physically remove the
// child node, so the container never accumulates videos.

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface CameraScannerProps {
  /** called once per successful decode; scanning pauses briefly after each */
  onDecode: (text: string) => void;
  onError?: (message: string) => void;
  /** ms to ignore further decodes after a hit (debounce duplicate scans) */
  cooldownMs?: number;
  className?: string;
}

let seq = 0;

const CameraScanner: React.FC<CameraScannerProps> = ({
  onDecode,
  onError,
  cooldownMs = 2500,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastHitRef = useRef(0);
  const onDecodeRef = useRef(onDecode);
  const onErrorRef = useRef(onError);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onDecodeRef.current = onDecode;
    onErrorRef.current = onError;
  }, [onDecode, onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Fresh child node owned solely by this effect run.
    const mountId = `qr-scan-${++seq}`;
    const mount = document.createElement("div");
    mount.id = mountId;
    mount.style.width = "100%";
    // Remove any leftover nodes from a previous aborted run, then attach ours.
    container.innerHTML = "";
    container.appendChild(mount);

    const scanner = new Html5Qrcode(mountId, { verbose: false });
    let disposed = false;
    let startResolved = false;

    const handleSuccess = (decodedText: string) => {
      const now = Date.now();
      if (now - lastHitRef.current < cooldownMs) return;
      lastHitRef.current = now;
      onDecodeRef.current(decodedText);
    };

    const teardown = () => {
      const finish = () => {
        try {
          scanner.clear();
        } catch {
          /* already cleared */
        }
        // Physically remove this run's node so no <video> can linger.
        if (mount.parentNode) mount.parentNode.removeChild(mount);
      };
      let scanning = false;
      try {
        scanning = scanner.isScanning;
      } catch {
        scanning = false;
      }
      if (scanning) {
        scanner.stop().then(finish).catch(finish);
      } else {
        finish();
      }
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleSuccess,
        undefined, // per-frame decode errors are noisy; ignore
      )
      .then(() => {
        startResolved = true;
        if (disposed) teardown();
        else setReady(true);
      })
      .catch((err: unknown) => {
        if (disposed) return;
        const msg =
          "Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan, atau gunakan check-in manual.";
        console.warn("[CameraScanner] start failed:", err);
        setError(msg);
        onErrorRef.current?.(msg);
      });

    return () => {
      disposed = true;
      // If start already resolved, stop+remove now. If not, the .then above runs
      // teardown once it resolves (disposed === true).
      if (startResolved) teardown();
    };
  }, [cooldownMs]);

  return (
    <div className={className}>
      <div className="relative mx-auto w-full max-w-[320px]">
        <div
          ref={containerRef}
          className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-black [&_video]:block [&_video]:w-full [&_video]:rounded-2xl [&_video]:object-cover"
        />
        {/* scan overlay — corner frame + moving line */}
        {ready && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[240px] w-[240px]">
              <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-lg border-l-[3px] border-t-[3px] border-[var(--color-primary)]" />
              <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-lg border-r-[3px] border-t-[3px] border-[var(--color-primary)]" />
              <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-lg border-b-[3px] border-l-[3px] border-[var(--color-primary)]" />
              <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-lg border-b-[3px] border-r-[3px] border-[var(--color-primary)]" />
              <div className="animate-qr-scan absolute inset-x-2 top-0 h-0.5 rounded bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-primary)]" />
            </div>
          </div>
        )}
      </div>
      {!ready && !error && (
        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">Memulai kamera…</p>
      )}
      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-center text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
};

export default CameraScanner;
