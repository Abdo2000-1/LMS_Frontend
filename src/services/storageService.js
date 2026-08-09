import { appwriteConfig, ID, storage } from "../lib/appwrite.js";

export async function uploadToAppwriteStorage(file, onProgress) {
  if (!file) throw new Error("No file selected.");

  const uploaded = await storage.createFile(
    appwriteConfig.bucketId,
    ID.unique(),
    file,
    undefined,
    (progress) => {
      if (!onProgress) return;
      onProgress({
        loaded: progress.loaded,
        total: progress.total,
        percent: progress.progress,
      });
    }
  );

  return storage.getFileView(appwriteConfig.bucketId, uploaded.$id).toString();
}

export function uploadImageToStorage(file, onProgress) {
  if (!String(file?.type || "").startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  return uploadToAppwriteStorage(file, onProgress);
}

export function uploadFileToStorage(file, onProgress) {
  return uploadToAppwriteStorage(file, onProgress);
}

export function getStorageFileViewUrl(fileId) {
  return storage.getFileView(appwriteConfig.bucketId, fileId).toString();
}
