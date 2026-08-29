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
