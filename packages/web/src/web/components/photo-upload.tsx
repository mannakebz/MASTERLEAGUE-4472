import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import { client } from "../lib/api";
export function PhotoUpload({
  value,
  url,
  label,
  onChange,
}: {
  value: string;
  url?: string;
  label: string;
  onChange: (key: string) => void;
}) {
  const [preview, setPreview] = useState("");
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("Choose a JPG, PNG or WebP image up to 5 MB.");
      const { url, key } = await client.photos.presign({
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        size: file.size,
      });
      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!response.ok) throw new Error("Upload failed. Try again.");
      const result = await client.photos.preview({ key });
      return { key, url: result.url };
    },
    onSuccess: (result) => {
      setPreview(result.url);
      onChange(result.key);
    },
  });
  return (
    <div className="photo-upload">
      <div className="upload-preview">
        {value && (preview || url) ? (
          <img src={preview || url} alt={label} />
        ) : (
          <Upload size={23} />
        )}
      </div>
      <div>
        <label className="upload-label">
          {upload.isPending ? "Uploading…" : label}
          <input
            aria-label={label}
            disabled={upload.isPending}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
        </label>
        <p>JPG, PNG or WebP · Up to 5 MB · Save to publish</p>
        {upload.error && (
          <p className="upload-error" role="alert">
            {upload.error.message}
          </p>
        )}
      </div>
      {value && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={() => {
            setPreview("");
            onChange("");
          }}
        >
          <X size={17} />
        </button>
      )}
    </div>
  );
}
