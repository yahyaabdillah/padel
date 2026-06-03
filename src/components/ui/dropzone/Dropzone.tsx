"use client";

import React, { ReactNode, useCallback, useRef, useState } from "react";

export type DropzoneFile = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

export type FileValidation = {
  /** ukuran maksimal per file dalam MB */
  maxSizeMB?: number;
  /** tipe MIME / ekstensi yang diizinkan, mis. ["image/png", "image/jpeg"] atau [".pdf"] */
  accept?: string[];
  /** jumlah maksimal file */
  maxFiles?: number;
};

interface DropzoneProps {
  /** ikon/gambar di tengah — bisa dikustomisasi */
  icon?: ReactNode;
  title?: string;
  description?: string;
  multiple?: boolean;
  validation?: FileValidation;
  /** validator kustom: kembalikan string error atau null jika valid */
  validateFile?: (file: File) => string | null;
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
  onFilesChange?: (files: DropzoneFile[]) => void;
  onReject?: (file: File, reason: string) => void;
}

const DefaultIcon = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: File) {
  return file.type.startsWith("image/");
}

const Dropzone: React.FC<DropzoneProps> = ({
  icon,
  title = "Tarik & lepas file di sini",
  description = "atau klik untuk memilih",
  multiple = true,
  validation = {},
  validateFile,
  showPreview = true,
  disabled = false,
  className = "",
  onFilesChange,
  onReject,
}) => {
  const { maxSizeMB, accept, maxFiles } = validation;
  const [files, setFiles] = useState<DropzoneFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback(
    (file: File): string | null => {
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        return `Ukuran melebihi ${maxSizeMB}MB`;
      }
      if (accept && accept.length > 0) {
        const okType = accept.some((a) =>
          a.startsWith(".") ? file.name.toLowerCase().endsWith(a.toLowerCase()) : file.type === a || file.type.startsWith(a.replace("/*", "/"))
        );
        if (!okType) return "Tipe file tidak didukung";
      }
      if (validateFile) return validateFile(file);
      return null;
    },
    [maxSizeMB, accept, validateFile]
  );

  const simulateUpload = useCallback((id: string) => {
    let prog = 0;
    const timer = setInterval(() => {
      prog += Math.random() * 30 + 10;
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: Math.min(prog, 100), status: prog >= 100 ? "done" : "uploading" } : f))
      );
      if (prog >= 100) clearInterval(timer);
    }, 250);
  }, []);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (disabled) return;
      const incoming = Array.from(fileList);
      const accepted: DropzoneFile[] = [];

      for (const file of incoming) {
        if (maxFiles && files.length + accepted.length >= maxFiles) {
          onReject?.(file, `Maksimal ${maxFiles} file`);
          continue;
        }
        const error = validate(file);
        if (error) {
          onReject?.(file, error);
          continue;
        }
        accepted.push({
          id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          file,
          preview: isImage(file) ? URL.createObjectURL(file) : "",
          progress: 0,
          status: "uploading",
        });
      }

      if (accepted.length === 0) return;
      setFiles((prev) => {
        const next = multiple ? [...prev, ...accepted] : accepted;
        onFilesChange?.(next);
        return next;
      });
      accepted.forEach((f) => simulateUpload(f.id));
    },
    [disabled, files.length, maxFiles, multiple, validate, onReject, onFilesChange, simulateUpload]
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const target = prev.find((f) => f.id === id);
        if (target?.preview) URL.revokeObjectURL(target.preview);
        const next = prev.filter((f) => f.id !== id);
        onFilesChange?.(next);
        return next;
      });
    },
    [onFilesChange]
  );

  const acceptAttr = accept?.join(",");

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={acceptAttr}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Drop area */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
        className={[
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer active:scale-[0.99]",
          dragOver
            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] scale-[1.01]"
            : "border-[var(--border-strong)] hover:border-[var(--color-primary)] hover:bg-[var(--surface-muted)]",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
            dragOver ? "bg-[var(--color-primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--color-primary)]",
          ].join(" ")}
        >
          {icon || <DefaultIcon />}
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--text-heading)]">
            {dragOver ? "Lepas file di sini!" : title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-caption)]">{description}</p>
        </div>
        {(maxSizeMB || accept || maxFiles) && (
          <p className="text-[10px] text-[var(--text-muted)]">
            {accept ? accept.join(", ") : "Semua tipe"}
            {maxSizeMB ? ` • maks ${maxSizeMB}MB` : ""}
            {maxFiles ? ` • maks ${maxFiles} file` : ""}
          </p>
        )}
      </button>

      {/* File list / preview */}
      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-2.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)]">
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt={f.file.name} className="h-full w-full object-cover" />
                ) : (
                  <FileIcon />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[var(--text-heading)]">{f.file.name}</p>
                  <span className={`shrink-0 text-[10px] font-semibold ${f.status === "done" ? "text-emerald-500" : f.status === "error" ? "text-red-500" : "text-[var(--color-primary)]"}`}>
                    {f.status === "done" ? "Selesai" : f.status === "error" ? "Gagal" : `${Math.round(f.progress)}%`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${f.status === "done" ? "bg-emerald-500" : f.status === "error" ? "bg-red-500" : "bg-[var(--color-primary)]"}`}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{formatBytes(f.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                aria-label="Hapus file"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropzone;
