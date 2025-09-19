import { apiRequest } from "./queryClient";

export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeAuthToken(): void {
  localStorage.removeItem("token");
}

export async function authenticatedRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  // Handle FormData differently from regular JSON data
  const isFormData = data instanceof FormData;
  
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  
  // Only set Content-Type for JSON data, let browser set it for FormData
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeAuthToken();
      window.location.href = "/login";
    }
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response;
}
