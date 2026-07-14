import imageCompression from 'browser-image-compression';

const DEFAULT_COMPRESSION = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  fileType: 'image/jpeg',
};

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file, options = {}) {
  const settings = { ...DEFAULT_COMPRESSION, ...options };
  const compressed = await imageCompression(file, settings);
  const ext = settings.fileType === 'image/png' ? 'png' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';

  return new File([compressed], `${baseName}.${ext}`, {
    type: settings.fileType || 'image/jpeg',
    lastModified: Date.now(),
  });
}

/** Compress then encode for JSON upload payloads. */
export async function imageToUploadPayload(file, options = {}) {
  const compressed = await compressImage(file, options);
  return {
    base64: await fileToBase64(compressed),
    fileName: compressed.name,
    contentType: compressed.type,
  };
}
