
interface ApiOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export async function apiCall(url: string, options: ApiOptions = {}): Promise<Response> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        credentials: 'include',
        signal: controller.signal,
        ...fetchOptions
      });

      clearTimeout(timeoutId);
      
      // Don't retry on client errors (4xx) except 401/403
      if (response.ok || (response.status >= 400 && response.status < 500 && ![401, 403].includes(response.status))) {
        return response;
      }
      
      if (i === retries) {
        return response; // Last attempt, return whatever we got
      }
      
    } catch (error) {
      if (i === retries) {
        throw error; // Last attempt, throw the error
      }
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, i)));
  }
  
  throw new Error('Max retries exceeded');
}

export async function apiPost(url: string, data: any, options: ApiOptions = {}) {
  return apiCall(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options
  });
}

export async function apiGet(url: string, options: ApiOptions = {}) {
  return apiCall(url, options);
}

export async function apiRequest(method: string, url: string, data?: any, options: ApiOptions = {}) {
  if (method === 'GET') {
    return apiGet(url, options);
  } else if (method === 'POST') {
    return apiPost(url, data, options);
  } else {
    return apiCall(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  }
}
