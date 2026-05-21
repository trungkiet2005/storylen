"use client";

import React, { useState } from "react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  APIError,
  voteForumTarget,
  type ForumTargetType,
  type ForumVoteValue,
} from "@/lib/api";

interface Props {
  targetType: ForumTargetType;
  targetId: string;
  initialScore: number;
  initialVote: ForumVoteValue;
  orientation?: "vertical" | "horizontal";
}

/**
 * Compact up/down vote control with optimistic update + server rollback on error.
 * Anonymous click → toast "login required".
 */
export function VoteButtons({
  targetType,
  targetId,
  initialScore,
  initialVote,
  orientation = "vertical",
}: Props) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [score, setScore] = useState(initialScore);
  const [myVote, setMyVote] = useState<ForumVoteValue>(initialVote);
  const [pending, setPending] = useState(false);

  const cast = async (next: ForumVoteValue) => {
    if (!isAuthenticated) {
      toast(t("forum.login_required"), "info");
      return;
    }
    if (pending) return;
    const prevScore = score;
    const prevVote = myVote;
    // Optimistic delta: score += (next - myVote).
    setScore(prevScore + (next - prevVote));
    setMyVote(next);
    setPending(true);
    try {
      const res = await voteForumTarget(targetType, targetId, next);
      setScore(res.score);
      setMyVote(res.my_vote);
    } catch (err) {
      setScore(prevScore);
      setMyVote(prevVote);
      const msg = err instanceof APIError ? err.message : "Vote thất bại.";
      toast(msg, "error");
    } finally {
      setPending(false);
    }
  };

  const onUp = () => cast(myVote === 1 ? 0 : 1);
  const onDown = () => cast(myVote === -1 ? 0 : -1);

  const arrowBtn = (
    dir: "up" | "down",
    active: boolean,
    onClick: () => void,
    label: string,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={pending}
      className="stroke-ink"
      style={{
        width: 24,
        height: 24,
        padding: 0,
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--fg)",
        cursor: pending ? "wait" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        lineHeight: 1,
        fontWeight: 700,
      }}
    >
      {dir === "up" ? "▲" : "▼"}
    </button>
  );

  const isVertical = orientation === "vertical";
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: isVertical ? "column" : "row",
        alignItems: "center",
        gap: 4,
        minWidth: isVertical ? 28 : "auto",
      }}
    >
      {arrowBtn("up", myVote === 1, onUp, t("forum.upvote"))}
      <span
        className="caps-xs"
        style={{
          fontSize: 12,
          fontWeight: 800,
          color:
            myVote === 1 ? "var(--accent)" : myVote === -1 ? "var(--muted)" : "var(--fg)",
          minWidth: 18,
          textAlign: "center",
        }}
      >
        {score}
      </span>
      {arrowBtn("down", myVote === -1, onDown, t("forum.downvote"))}
    </div>
  );
}
