import { AuthResponse, DateIdea, ShouldDoAgain, PartnerStatus, PaginatedResponse, CalendarEvent } from './types';

const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
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
    if (!response.ok) throw new Error('Failed to fetch partner status');
    return response.json();
  },
};

export const dateIdeasApi = {
  getAll: async (page: number = 1, pageSize: number = 5): Promise<PaginatedResponse<DateIdea>> => {
    const response = await fetch(`${API_BASE}/date-ideas?page=${page}&pageSize=${pageSize}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch date ideas');
    return response.json();
  },

  create: async (title: string, description: string): Promise<DateIdea> => {
    const response = await fetch(`${API_BASE}/date-ideas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description }),
    });
    if (!response.ok) throw new Error('Failed to create date idea');
    return response.json();
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
    if (!response.ok) throw new Error('Failed to update date idea');
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/date-ideas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete date idea');
  },

  vote: async (id: number): Promise<{ message: string; moved: boolean; vote_count?: number }> => {
    const response = await fetch(`${API_BASE}/date-ideas/${id}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to vote');
    return response.json();
  },

  removeVote: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/date-ideas/${id}/vote`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove vote');
  },
};

export const shouldDoAgainApi = {
  getAll: async (page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<ShouldDoAgain>> => {
    const response = await fetch(`${API_BASE}/should-do-again?page=${page}&pageSize=${pageSize}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch should do again list');
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/should-do-again/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete from should do again list');
  },
};

export const calendarEventsApi = {
  getEvents: async (start: string, end: string): Promise<CalendarEvent[]> => {
    const response = await fetch(`${API_BASE}/calendar-events?start=${start}&end=${end}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch calendar events');
    return response.json();
  },

  create: async (event: Omit<CalendarEvent, 'id' | 'couple_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> => {
    const response = await fetch(`${API_BASE}/calendar-events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error('Failed to create calendar event');
    return response.json();
  },

  update: async (id: number, updates: Partial<Omit<CalendarEvent, 'id' | 'couple_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>>): Promise<CalendarEvent> => {
    const response = await fetch(`${API_BASE}/calendar-events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update calendar event');
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/calendar-events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete calendar event');
  },
};
