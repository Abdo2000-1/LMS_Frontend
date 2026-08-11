/**
 * storageService.js
 * File uploads go through the .NET backend → Azure Blob Storage.
 */

import apiClient from "../lib/apiClient.js";

const requestConfig = { skipGlobalErrorToast: true };

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
      ...requestConfig,
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
 * Upload course resource files (PDF, PowerPoint).
 */
export async function uploadFileToStorage(file, onProgress) {
  if (!file) throw new Error("لم يتم اختيار ملف.");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await apiClient.post("/api/courses/upload-resource", formData, {
      ...requestConfig,
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
