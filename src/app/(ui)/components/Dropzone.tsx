"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

const ACCEPT: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

type Phase = "idle" | "uploading" | "registering" | "error";

/** Presigned direct-to-R2 upload, then register + kick off ingestion (PRD F1.1, FRONTEND_DESIGN §7.1). */
export function Dropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!ACCEPT[file.type]) {
        setError("Upload a PDF or DOCX contract.");
        setPhase("error");
        return;
      }
      try {
        setPhase("uploading");
        const presign = await fetch("/api/contracts/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        }).then((r) => r.json());

        await fetch(presign.url, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });

        setPhase("registering");
        const contract = await fetch("/api/contracts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            r2Key: presign.key,
            title: file.name.replace(/\.[^.]+$/, ""),
            originalFilename: file.name,
            mimeType: file.type,
          }),
        }).then((r) => r.json());

        router.push(`/contracts/${contract.id}`);
      } catch {
        setError("Upload failed. Please try again.");
        setPhase("error");
      }
    },
    [router],
  );

  const busy = phase === "uploading" || phase === "registering";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      className={`cursor-pointer rounded-[var(--radius)] border border-dashed p-12 text-center transition-colors ${
        dragging ? "border-[var(--claret)] bg-[var(--paper-2)]" : "border-[var(--paper-edge)]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={Object.values(ACCEPT).join(",")}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <p className="text-lg text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
        {busy
          ? phase === "uploading"
            ? "Uploading contract…"
            : "Filing & starting analysis…"
          : "Drop a contract here"}
      </p>
      <p className="mt-1 text-sm text-[var(--ink-3)]">PDF or DOCX · up to 100 pages</p>
      {error && <p className="mt-3 text-sm text-[var(--risk-critical)]">{error}</p>}
    </div>
  );
}
