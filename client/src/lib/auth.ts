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
  console.log("Auth token present:", !!token);
  console.log("Making authenticated request to:", method, url);
  
  if (!token) {
    console.error("No authentication token found in localStorage");
    throw new Error("No authentication token found - please log in again");
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

  console.log("Request headers:", { ...headers, Authorization: "Bearer [REDACTED]" });
  console.log("Request data:", data);

  const response = await fetch(url, {
    method,
    headers,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
  });

  console.log("Response status:", response.status);
  console.log("Response ok:", response.ok);

  if (!response.ok) {
    const responseText = await response.text();
    console.error("API Error Response:", response.status, responseText);
    
    if (response.status === 401) {
      console.warn("Authentication failed - removing token and redirecting to login");
      removeAuthToken();
      window.location.href = "/login";
      throw new Error("Authentication expired - please log in again");
    }
    throw new Error(`API Error ${response.status}: ${responseText}`);
  }

  return response;
}
