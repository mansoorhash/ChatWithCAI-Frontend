import React from "react";
import { FileText } from "lucide-react";
import "./attachments.css";

function getFileType(file) {
  const mimeType = file?.mimeType?.toLowerCase();
  const extension = file?.name?.split(".").pop()?.toUpperCase();

  if (mimeType === "application/pdf") return "PDF";
  if (mimeType?.startsWith("image/")) return "Image";
  if (mimeType?.startsWith("audio/")) return "Audio";
  if (mimeType?.startsWith("video/")) return "Video";
  if (mimeType?.startsWith("text/")) return "Text";

  return extension ? `${extension} file` : "File";
}

export default function Attachments({ files }) {
  if (!Array.isArray(files) || files.length === 0) return null;

  return (
    <div className="attachment-list" role="list" aria-label="Attached files">
      {files.map((file, index) => {
        const fileName = file?.name || "Attachment";

        return (
          <div
            className="attachment-item"
            key={file?.fileId || `${file?.name}-${index}`}
            role="listitem"
          >
            <span className="attachment-icon" aria-hidden="true">
              <FileText size={14} strokeWidth={1.8} />
            </span>

            <span className="attachment-info">
              <span className="attachment-name" title={fileName}>
                {fileName}
              </span>

              <span className="attachment-meta">
                {getFileType(file)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
