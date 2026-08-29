import apiClient from "../lib/apiClient.js";

const requestConfig = { skipGlobalErrorToast: true };

function extractErrorMessage(error) {
  if (error?.response?.data?.errors) {
    const fieldErrors = Object.values(error.response.data.errors).flat().join(" - ");
    if (fieldErrors) return fieldErrors;
  }
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "حدث خطأ غير متوقع."
  );
}

export async function generateAccessCodes({ courseId, accessType, allowedLectureIds, quantity }) {
  try {
    const { data } = await apiClient.post(
      "/api/accesscodes/generate",
      {
        courseId,
        accessType,
        allowedLectureIds,
        quantity: Number(quantity),
      },
      requestConfig
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getAccessCodesForCourse(courseId, { page = 1, pageSize = 200, status, search } = {}) {
  try {
    const params = new URLSearchParams();
    if (page) params.append("page", page);
    if (pageSize) params.append("pageSize", pageSize);
    if (status) params.append("status", status);
    if (search) params.append("search", search);

    const { data } = await apiClient.get(`/api/accesscodes/course/${courseId}?${params.toString()}`, requestConfig);
    return {
      items: Array.isArray(data) ? data : (data?.items || []),
      totalCount: data?.totalCount || (Array.isArray(data) ? data.length : 0),
      page: data?.page || page,
      pageSize: data?.pageSize || pageSize
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function claimAccessCode({ code }) {
  try {
    const { data } = await apiClient.post(
      "/api/accesscodes/claim",
      { code: String(code || "").trim() },
      requestConfig
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function revokeAccessCode(codeId) {
  try {
    await apiClient.post(`/api/accesscodes/${codeId}/revoke`, {}, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function revokeAllAccessCodes(courseId) {
  try {
    await apiClient.post(`/api/accesscodes/course/${courseId}/revoke-all`, {}, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getStudentEntitlements(courseId) {
  try {
    const { data } = await apiClient.get(`/api/accesscodes/course/${courseId}/entitlements`, requestConfig);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
