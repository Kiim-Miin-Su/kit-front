"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";

import type { SubmissionAttachment } from "@/types/submission";

export function SelectedFilesPreview({
  files,
  title = "첨부 미리보기",
  onRemoveFile,
}: {
  files: File[];
  title?: string;
  onRemoveFile?: (index: number) => void;
}) {
  const objectUrls = useMemo(() => {
    const nextUrls: Record<number, string> = {};

    files.forEach((file, index) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        nextUrls[index] = URL.createObjectURL(file);
      }
    });
    return nextUrls;
  }, [files]);

  useEffect(() => {
    return () => {
      Object.values(objectUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {files.map((file, index) => (
          <div key={`${file.name}-${file.lastModified}-${index}`} className="rounded-lg bg-slate-50 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">{file.name}</p>
                <p className="text-[11px] text-slate-500">
                  {file.type || "application/octet-stream"} · {formatFileSize(file.size)}
                </p>
              </div>
              {onRemoveFile ? (
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="inline-flex h-7 items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700"
                >
                  제거
                </button>
              ) : null}
            </div>
            {objectUrls[index] ? (
              file.type.startsWith("image/") ? (
                <Image
                  src={objectUrls[index]}
                  alt={file.name}
                  width={560}
                  height={240}
                  unoptimized
                  className="mt-2 max-h-36 w-auto rounded-md border border-slate-200 object-contain"
                />
              ) : (
                <video
                  controls
                  src={objectUrls[index]}
                  className="mt-2 max-h-44 w-full rounded-md border border-slate-200"
                />
              )
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubmissionAttachmentMetaList({
  attachments,
  title = "첨부 메타",
}: {
  attachments: SubmissionAttachment[];
  title?: string;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-xs font-semibold text-slate-700">{attachment.fileName}</p>
            <p className="text-[11px] text-slate-500">
              {attachment.mimeType || "application/octet-stream"} ·{" "}
              {formatFileSize(attachment.sizeBytes)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        현재 저장 구조는 파일 메타데이터 기반이라 실제 바이너리 미리보기는 제공하지 않습니다.
      </p>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${size} B`;
}
