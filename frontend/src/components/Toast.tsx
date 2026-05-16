"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Icon } from './Icons';
import { TOAST_CONFIG } from '@/lib/constants';

let _toastCounter = 0;

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, string> = {
  success: "check",
  error: "alert",
  info: "info",
  warning: "alert",
};

const COLORS: Record<ToastType, { bg: string; color: string; border: string }> = {
  success: { bg: "var(--jade)", color: "#fff", border: "var(--border)" },
  error:   { bg: "var(--beni)", color: "#fff", border: "var(--border)" },
  info:    { bg: "var(--ink)", color: "var(--paper)", border: "var(--border)" },
  warning: { bg: "var(--gold)", color: "#fff", border: "var(--border)" },
};

function ToastItem({ item, onRemove }: { item: Toast; onRemove: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), item.duration ?? TOAST_CONFIG.DEFAULT_DURATION);
    return () => clearTimeout(t);
  }, [item, onRemove]);

  const c = COLORS[item.type];

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
        background: c.bg,
        color: c.color,
        border: `2px solid ${c.border}`,
        boxShadow: "4px 4px 0 0 var(--border)",
        borderRadius: 2,
        fontSize: 13,
        fontWeight: 600,
        maxWidth: 360,
        animation: "slideInLeft 0.2s ease",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={() => onRemove(item.id)}
      role="alert"
      aria-live="polite"
    >
      <Icon name={ICONS[item.type]} size={15} />
      <span style={{ flex: 1 }}>{item.message}</span>
      <Icon name="x" size={12} />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration: number = TOAST_CONFIG.DEFAULT_DURATION) => {
    const id = Date.now() + _toastCounter++;
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-like fixed container */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        aria-label="Thông báo"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} item={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
