"use client";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  label?: string;
}

export function FileDropzone({ onFiles, accept, multiple = false, label }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    accept,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group select-none",
        isDragActive
          ? "border-brand-500 bg-brand-50 scale-[1.01] shadow-lg shadow-brand-100"
          : "border-gray-300 hover:border-brand-400 hover:bg-gray-50 hover:shadow-sm"
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        "transition-transform duration-200",
        isDragActive ? "scale-110" : "group-hover:scale-105"
      )}>
        <UploadCloud className={cn(
          "mx-auto mb-3 h-10 w-10 transition-colors duration-200",
          isDragActive ? "text-brand-500" : "text-gray-400 group-hover:text-brand-400"
        )} />
      </div>
      <p className={cn(
        "text-sm font-medium transition-colors duration-200",
        isDragActive ? "text-brand-700" : "text-gray-600"
      )}>
        {isDragActive ? "Release to upload…" : label || "Drag & drop files, or click to browse"}
      </p>
      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, MD, CSV, JSON, and code files</p>
    </div>
  );
}
