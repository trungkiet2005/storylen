"use client";
import { useEffect } from "react";
import { useWibu, ACHIEVEMENTS } from "@/contexts/WibuContext";
import { useToast } from "@/components/Toast";

/**
 * Watches the wibu context for newly-unlocked achievements and surfaces them
 * via a toast. Lives inside <ToastProvider> so it can call useToast().
 */
export function AchievementToaster() {
  const { newlyUnlocked, consumeNewlyUnlocked } = useWibu();
  const { toast } = useToast();

  useEffect(() => {
    if (newlyUnlocked.length === 0) return;
    for (const id of newlyUnlocked) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (!def) continue;
      toast(`🏆 Mở khoá: ${def.label} — ${def.description}`, "success");
    }
    consumeNewlyUnlocked();
  }, [newlyUnlocked, consumeNewlyUnlocked, toast]);

  return null;
}
