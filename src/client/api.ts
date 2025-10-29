import { AuthResponse, DateIdea, ShouldDoAgain, PartnerStatus, PaginatedResponse, CalendarEvent } from './types';

const API_BASE = '/api';

let onAuthError: (() => void) | null = null;

export const setAuthErrorHandler = (handler: () => void) => {
  onAuthError = handler;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    if (onAuthError) {
      onAuthError();
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const authApi = {
  register: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    return response.json();
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    return response.json();
  },

  pair: async (partnerUsername: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/auth/pair`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ partnerUsername }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Pairing failed');
    }
    return response.json();
  },

  getPartnerStatus: async (): Promise<PartnerStatus> => {
    const response = await fetch(`${API_BASE}/auth/partner`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<PartnerStatus>(response);
  },
};

export const dateIdeasApi = {
  getAll: async (page: number = 1, pageSize: number = 5): Promise<PaginatedResponse<DateIdea>> => {
    const response = await fetch(`${API_BASE}/date-ideas?page=${page}&pageSize=${pageSize}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<PaginatedResponse<DateIdea>>(response);
  },

  create: async (title: string, description: string): Promise<DateIdea> => {
    const response = await fetch(`${API_BASE}/date-ideas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description }),
    });
    return handleResponse<DateIdea>(response);
  },

  update: async (
    id: number,
    updates: Partial<Omit<DateIdea, 'id' | 'user_id' | 'created_at'>>
  ): Promise<DateIdea> => {
    const response = await fetch(`${API_BASE}/date-ideas/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<DateIdea>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/date-ideas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
  },

  vote: async (id: number): Promise<{ message: string; moved: boolean; vote_count?: number }> => {
    const response = await fetch(`${API_BASE}/date-ideas/${id}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; moved: boolean; vote_count?: number }>(response);
  },

  removeVote: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/date-ideas/${id}/vote`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
  },
};

export const shouldDoAgainApi = {
  getAll: async (page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<ShouldDoAgain>> => {
    const response = await fetch(`${API_BASE}/should-do-again?page=${page}&pageSize=${pageSize}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<PaginatedResponse<ShouldDoAgain>>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/should-do-again/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
  },
};

export const calendarEventsApi = {
  getEvents: async (start: string, end: string): Promise<CalendarEvent[]> => {
    const response = await fetch(`${API_BASE}/calendar-events?start=${start}&end=${end}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<CalendarEvent[]>(response);
  },

  create: async (event: Omit<CalendarEvent, 'id' | 'couple_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> => {
    const response = await fetch(`${API_BASE}/calendar-events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(event),
    });
    return handleResponse<CalendarEvent>(response);
  },

  update: async (id: number, updates: Partial<Omit<CalendarEvent, 'id' | 'couple_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>>): Promise<CalendarEvent> => {
    const response = await fetch(`${API_BASE}/calendar-events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<CalendarEvent>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/calendar-events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
  },

  getSubscriptionUrl: async (): Promise<{ subscriptionUrl: string }> => {
    const response = await fetch(`${API_BASE}/calendar-events/subscription-url`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ subscriptionUrl: string }>(response);
  },
};

export const googleCalendarApi = {
  getConnectUrl: async (): Promise<{ authUrl: string }> => {
    const response = await fetch(`${API_BASE}/google-calendar/connect`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ authUrl: string }>(response);
  },

  getStatus: async (): Promise<{ isConnected: boolean }> => {
    const response = await fetch(`${API_BASE}/google-calendar/status`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ isConnected: boolean }>(response);
  },

  disconnect: async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/google-calendar/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },
};
