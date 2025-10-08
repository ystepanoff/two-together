export interface User {
  id: number;
  username: string;
}

export interface Partner {
  id: number;
  username: string;
}

export interface PartnerStatus {
  hasPair: boolean;
  partner?: Partner;
}

export interface DateIdea {
  id: number;
  couple_id: number;
  created_by_user_id: number;
  title: string;
  description: string;
  is_completed: boolean;
  is_favorite: boolean;
  created_at: string;
  completed_at?: string;
  vote_count?: number;
  current_user_voted?: boolean;
}

export interface ShouldDoAgain {
  id: number;
  couple_id: number;
  title: string;
  description: string;
  original_date_idea_id?: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
