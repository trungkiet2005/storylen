import { APIError } from "@/lib/api";

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}

export function errorMessage(err: unknown, fallback = "Có lỗi xảy ra."): string {
  if (err instanceof APIError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function clampOffset(offset: number, pageSize: number, total: number): number {
  if (total <= 0) return 0;
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1) * pageSize;
  return Math.max(0, Math.min(offset, lastPage));
}
