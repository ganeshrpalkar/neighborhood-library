export interface AuthUser {
  id: number | string;
  email: string;
  name?: string | null;
  roles: string[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  published_year: number | null;
  genre: string | null;
  total_copies: number;
  available_copies: number;
  has_cover: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LoanStatus = "active" | "returned" | "overdue";

export interface Loan {
  id: number;
  book_id: number;
  member_id: number;
  book_title: string;
  member_name: string;
  borrowed_at: string;
  due_date: string | null;
  returned_at: string | null;
  status: LoanStatus;
  fine_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface BookInput {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  published_year?: number;
  genre?: string;
  total_copies: number;
}

export interface MemberInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface LoanInput {
  book_id: number;
  member_id: number;
  due_date?: string;
}

export interface BookSuggestion {
  id: number;
  title: string;
  author: string;
  available_copies: number;
  has_cover: boolean;
}

export interface MemberSuggestion {
  id: number;
  name: string;
  email: string;
}
