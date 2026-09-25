export function getMimeTypeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".markdown": "text/markdown",
  }
  return map[ext.toLowerCase()] || "application/octet-stream"
}

export function getExtensionFromFilename(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ""
}

export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("读取文件失败"))
    reader.readAsDataURL(file)
  })
}

// Re-export from central utilities
export { formatFileSize } from "../utils/formatting"
export function isImageFile(mime: string): boolean {
  return mime.startsWith("image/")
}

export function isPdfFile(mime: string): boolean {
  return mime === "application/pdf"
}

export function isTextFile(mime: string): boolean {
  return mime.startsWith("text/")
}

export function isSupportedAttachmentType(mime: string): boolean {
  return isImageFile(mime) || isPdfFile(mime) || isTextFile(mime)
}

export function normalizeTextAttachment(mime: string, url: string): { mime: string; url: string } {
  if (!isTextFile(mime)) return { mime, url }

  return {
    mime: "text/plain",
    url: url.replace(/^data:[^;,]+/, "data:text/plain"),
  }
}
