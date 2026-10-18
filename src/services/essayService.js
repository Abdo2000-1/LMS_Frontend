import apiClient from "../lib/apiClient.js";

const requestConfig = { skipGlobalErrorToast: true };

function extractErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "حدث خطأ غير متوقع."
  );
}

export async function submitEssay(payload) {
  try {
    const { data } = await apiClient.post("/api/essaygrading/submit", payload, requestConfig);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getPendingEssays() {
  try {
    const { data } = await apiClient.get("/api/essaygrading/pending", requestConfig);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function gradeEssayByTeacher(submissionId, { finalScore, teacherFeedback }) {
  try {
    const { data } = await apiClient.post(
      `/api/essaygrading/${submissionId}/grade`,
      {
        finalScore: Number(finalScore),
        teacherFeedback: String(teacherFeedback || "").trim(),
      },
      requestConfig
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function evaluateEssayAi({ questionId, prompt, studentAnswer, modelAnswer, gradingRubric, maxScore = 1 }) {
  try {
    const { data } = await apiClient.post(
      "/api/essaygrading/evaluate",
      {
        questionId: questionId || "",
        prompt: String(prompt || "").trim(),
        studentAnswer: String(studentAnswer || "").trim(),
        modelAnswer: modelAnswer ? String(modelAnswer).trim() : null,
        gradingRubric: gradingRubric ? String(gradingRubric).trim() : null,
        maxScore: Number(maxScore || 1),
      },
      requestConfig
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export function parseEssayAnswer(answer) {
  if (!answer) return { text: "", imageUrl: "" };
  if (typeof answer === "object") {
    return {
      text: String(answer.text || "").trim(),
      imageUrl: String(answer.imageUrl || answer.image || "").trim(),
    };
  }
  const str = String(answer).trim();
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const parsed = JSON.parse(str);
      return {
        text: String(parsed.text || "").trim(),
        imageUrl: String(parsed.imageUrl || parsed.image || "").trim(),
      };
    } catch {}
  }
  const imgMatch = str.match(/https?:\/\/[^\s\)\"\'\<\>]+(?:\.png|\.jpg|\.jpeg|\.webp|\.gif|\/uploads\/[^\s\)]+)/i);
  if (imgMatch) {
    const imageUrl = imgMatch[0];
    const text = str.replace(imageUrl, "").replace(/\[(?:صورة الإجابة|صورة الحل|مرفق)\]:?/g, "").trim();
    return { text, imageUrl };
  }
  return { text: str, imageUrl: "" };
}

export function formatEssayAnswer(text = "", imageUrl = "") {
  const cleanText = String(text || "").trim();
  const cleanImage = String(imageUrl || "").trim();
  if (cleanImage) {
    return JSON.stringify({ text: cleanText, imageUrl: cleanImage });
  }
  return cleanText;
}

export async function compressImageFile(file, maxDimension = 1920, quality = 0.85) {
  if (!file || !file.type?.startsWith("image/")) return file;
  if (file.size < 500 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

