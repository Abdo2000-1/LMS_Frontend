import apiClient from "../lib/apiClient.js";

const requestConfig = { skipGlobalErrorToast: true };

/**
 * Send a question to the RAG Chemistry Chatbot
 * @param {string} question
 * @param {Array<{role: string, content: string}>} conversationHistory
 * @param {string|null} courseId
 */
export async function askChatbot(question, conversationHistory = [], courseId = null) {
  try {
    const { data } = await apiClient.post(
      "/api/chat/ask",
      {
        question: String(question || "").trim(),
        courseId: courseId || null,
        conversationHistory: (conversationHistory || []).map((msg) => ({
          role: msg.role === "model" || msg.role === "assistant" ? "model" : "user",
          content: String(msg.content || "").trim(),
        })),
      },
      requestConfig
    );

    return {
      answer: data.answer || "عذراً، لم أتمكن من استخراج إجابة دقيقة حالياً.",
      sourceLectures: Array.isArray(data.sourceLectures) ? data.sourceLectures : [],
      createdAt: data.createdAt || new Date().toISOString(),
    };
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.title ||
      error?.message ||
      "تعذر الاتصال بالمساعد الذكي، تأكد من الاتصال بالإنترنت.";
    throw new Error(message);
  }
}
