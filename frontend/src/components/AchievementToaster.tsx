"use client";
import { useEffect } from "react";
import { useWibu, ACHIEVEMENTS } from "@/contexts/WibuContext";
import { useToast } from "@/components/Toast";

/**
 * Watches the wibu context for newly-unlocked achievements (and the weekly
 * reading-goal sentinel) and surfaces them via toast. Lives inside the
 * ToastProvider so it can call useToast().
 */
export function AchievementToaster() {
  const {
    newlyUnlocked, consumeNewlyUnlocked,
    weeklyGoalReached, consumeWeeklyGoal,
    goals, weekPages,
  } = useWibu();
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

  useEffect(() => {
    if (!weeklyGoalReached) return;
    toast(`🎯 Hoàn thành mục tiêu tuần! ${weekPages}/${goals.weeklyPages} trang`, "success");
    consumeWeeklyGoal();
  }, [weeklyGoalReached, weekPages, goals.weeklyPages, consumeWeeklyGoal, toast]);

  return null;
}
