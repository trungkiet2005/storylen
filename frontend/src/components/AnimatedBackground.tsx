"use client";

import React, { useEffect, useMemo, useState } from "react";

import { WALLPAPERS, type WallpaperPlaylist } from "@/lib/wallpaper-playlists";

// Default mix — all themes shuffled. Override via `images` or `playlist` props.
const DEFAULT_IMAGES: readonly string[] = WALLPAPERS.all;

type Props = {
  /** Pick a named curated playlist. Ignored if `images` is also passed. */
  playlist?: WallpaperPlaylist;
  /** Override the default playlist with raw paths. Takes priority over `playlist`. */
  images?: readonly string[];
  /** Milliseconds between slide changes. Default: 25_000 (25s). */
  intervalMs?: number;
  /** Overlay darkness intensity, 0..1. Default 0.7 for dark, lower for lighter. */
  overlay?: number;
  /** Disable on small screens to save mobile bandwidth. Default: false. */
  hideOnMobile?: boolean;
  /** When true, slideshow fills the parent (absolute) instead of viewport (fixed). */
  bounded?: boolean;
};

export function AnimatedBackground({
  playlist,
  images,
  intervalMs = 25_000,
  overlay = 0.7,
  hideOnMobile = false,
  bounded = false,
}: Props) {
  const list = useMemo(() => {
    if (images && images.length) return images;
    if (playlist && WALLPAPERS[playlist]?.length) return WALLPAPERS[playlist] as readonly string[];
    return DEFAULT_IMAGES;
  }, [images, playlist]);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (list.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, list.length]);

  if (!mounted) return null;

  const o1 = Math.max(0, Math.min(1, overlay)).toFixed(2);
  const o2 = Math.max(0, Math.min(1, overlay * 0.78)).toFixed(2);
  const o3 = Math.max(0, Math.min(1, overlay * 1.17)).toFixed(2);

  return (
    <div
      className={`anim-bg-root${bounded ? " anim-bg-bounded" : ""}`}
      data-hide-mobile={hideOnMobile ? "1" : "0"}
      aria-hidden="true"
    >
      {list.map((src, i) => (
        <div
          key={src}
          className={`anim-bg-slide${i === index ? " active" : ""}`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}
      <div
        className="anim-bg-overlay"
        style={{
          background: `linear-gradient(160deg, rgba(5,5,10,${o1}) 0%, rgba(10,8,20,${o2}) 50%, rgba(5,5,10,${o3}) 100%)`,
        }}
      />
    </div>
  );
}
