import axios, { AxiosError, AxiosInstance } from "axios";
import type {
  AuthUser,
  Book,
  BookInput,
  BookSuggestion,
  Loan,
  LoanInput,
  LoanStatus,
  Member,
  MemberInput,
  MemberSuggestion,
  Paginated,
  TokenResponse,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const TOKEN_KEY = "nl_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearToken();
      // Avoid redirect loop on the auth pages themselves.
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Extract a human-friendly message from an API error response. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { msg?: string; detail?: string | { msg?: string }[] }
      | undefined;
    if (data) {
      if (typeof data.msg === "string") return data.msg;
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail) && data.detail[0]?.msg) {
        return data.detail[0].msg as string;
      }
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ---------- Auth ----------
export async function register(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/register", body);
  return data;
}

export async function login(body: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/token", body);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

// ---------- Books ----------
export async function listBooks(params: {
  page?: number;
  page_size?: number;
  search?: string;
}): Promise<Paginated<Book>> {
  const { data } = await api.get<Paginated<Book>>("/books", { params });
  return data;
}

export async function getBook(id: number): Promise<Book> {
  const { data } = await api.get<Book>(`/books/${id}`);
  return data;
}

export async function createBook(body: BookInput): Promise<Book> {
  const { data } = await api.post<Book>("/books", body);
  return data;
}

export async function updateBook(
  id: number,
  body: Partial<BookInput>
): Promise<Book> {
  const { data } = await api.patch<Book>(`/books/${id}`, body);
  return data;
}

export async function deleteBook(id: number): Promise<{ success: boolean }> {
  const { data } = await api.delete<{ success: boolean }>(`/books/${id}`);
  return data;
}

/** Public URL of a book's cover image (served from the database). */
export function bookCoverUrl(id: number, bust?: string | number): string {
  return `${API_URL}/books/${id}/cover${bust ? `?v=${bust}` : ""}`;
}

export async function uploadBookCover(id: number, file: File): Promise<Book> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.put<Book>(`/books/${id}/cover`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function autocompleteBooks(q: string, limit = 8): Promise<BookSuggestion[]> {
  const { data } = await api.get<BookSuggestion[]>("/books/autocomplete", { params: { q, limit } });
  return data;
}

export async function autocompleteMembers(q: string, limit = 8): Promise<MemberSuggestion[]> {
  const { data } = await api.get<MemberSuggestion[]>("/members/autocomplete", { params: { q, limit } });
  return data;
}

// ---------- Members ----------
export async function listMembers(params: {
  page?: number;
  page_size?: number;
  search?: string;
}): Promise<Paginated<Member>> {
  const { data } = await api.get<Paginated<Member>>("/members", { params });
  return data;
}

export async function getMember(id: number): Promise<Member> {
  const { data } = await api.get<Member>(`/members/${id}`);
  return data;
}

export async function createMember(body: MemberInput): Promise<Member> {
  const { data } = await api.post<Member>("/members", body);
  return data;
}

export async function updateMember(
  id: number,
  body: Partial<MemberInput>
): Promise<Member> {
  const { data } = await api.patch<Member>(`/members/${id}`, body);
  return data;
}

export async function deleteMember(id: number): Promise<{ success: boolean }> {
  const { data } = await api.delete<{ success: boolean }>(`/members/${id}`);
  return data;
}

export async function getMemberLoans(id: number): Promise<Loan[]> {
  const { data } = await api.get<Loan[]>(`/members/${id}/loans`);
  return data;
}

// ---------- Loans ----------
export async function listLoans(params: {
  page?: number;
  page_size?: number;
  member_id?: number;
  status?: LoanStatus;
}): Promise<Paginated<Loan>> {
  const { data } = await api.get<Paginated<Loan>>("/loans", { params });
  return data;
}

export async function getLoan(id: number): Promise<Loan> {
  const { data } = await api.get<Loan>(`/loans/${id}`);
  return data;
}

export async function createLoan(body: LoanInput): Promise<Loan> {
  const { data } = await api.post<Loan>("/loans", body);
  return data;
}

export async function returnLoan(id: number): Promise<Loan> {
  const { data } = await api.post<Loan>(`/loans/${id}/return`);
  return data;
}
