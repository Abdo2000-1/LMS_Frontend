/**
 * storageService.js
 * File uploads go through the .NET backend → Azure Blob Storage.
 */

import apiClient from "../lib/apiClient.js";

function extractErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "فشل رفع الملف."
  );
}

/**
 * Upload an image file as a course thumbnail.
 * Sends multipart/form-data to POST /api/courses/upload-thumbnail
 * Returns the public Azure Blob URL of the uploaded image.
 *
 * @param {File} file
 * @param {Function} [onProgress] - optional (percent: number) => void
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadImageToStorage(file, onProgress) {
  if (!file) throw new Error("لم يتم اختيار ملف.");
  if (!String(file?.type || "").startsWith("image/")) {
    throw new Error("يُسمح بصور فقط (JPEG, PNG, WEBP, GIF).");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await apiClient.post("/api/courses/upload-thumbnail", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({ loaded: progressEvent.loaded, total: progressEvent.total, percent });
        }
      },
    });

    return data.url;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Upload any file (PDF, etc.) — same endpoint, backend validates type.
 * For non-image files, use a different endpoint if added later.
 */
export async function uploadFileToStorage(file, onProgress) {
  return uploadImageToStorage(file, onProgress);
}

/**
 * Returns the file URL directly — since we now store on Azure Blob,
 * the URL is already public and returned from the upload call.
 * This helper is kept for backwards compatibility.
 */
export function getStorageFileViewUrl(urlOrFileId) {
  // If it's already a full URL (Azure Blob), return as-is
  if (String(urlOrFileId || "").startsWith("http")) {
    return urlOrFileId;
  }
  // Fallback for any legacy file IDs
  return urlOrFileId;
}
