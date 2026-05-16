/**
 * Named wallpaper playlists used by <AnimatedBackground />.
 *
 * Curated set — 12 hand-picked images. Files live in /public/wallpapers/<theme>/.
 * To add: drop a file in the matching subdir and append its path to the right
 * array below.
 */

const DB = [
  "/wallpapers/dragonball/db2.webp",
  "/wallpapers/dragonball/db4.webp",
  "/wallpapers/dragonball/db5.webp",
  "/wallpapers/dragonball/db6.webp",
] as const;

const DS = [
  "/wallpapers/demon-slayer/ds3.webp",
  "/wallpapers/demon-slayer/kny1.webp",
] as const;

const JJK = [
  "/wallpapers/jujutsu/j2.webp",
] as const;

const NARUTO = [
  "/wallpapers/naruto/n2.webp",
] as const;

const XIANXIA = [
  "/wallpapers/xianxia/x4.webp",
  "/wallpapers/xianxia/x8.webp",
  "/wallpapers/xianxia/x10.webp",
] as const;

const BLUE_LOCK = [
  "/wallpapers/blue-lock/bl1.webp",
] as const;

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Named, ordered playlists. Pages pick whichever fits their mood. */
export const WALLPAPERS = {
  /** Pure Dragon Ball. */
  dragonball: DB,
  /** Demon Slayer (Kimetsu no Yaiba). */
  demonslayer: DS,
  jjk: JJK,
  naruto: NARUTO,
  /** Chinese cultivation / xianxia / donghua. */
  xianxia: XIANXIA,
  /** Blue Lock — sport shōnen, vibrant. */
  bluelock: BLUE_LOCK,

  /** ─── Curated multi-theme mixes ─────────────────────────────────────── */

  /** High-action shōnen mix for the home hero. */
  action: [...DB, ...BLUE_LOCK, ...NARUTO],

  /** Dark fantasy + curses (register page). */
  mystic: [...DS, ...JJK],

  /** Cultivation epics — used on browse to evoke library mood. */
  cultivation: XIANXIA,

  /** Pure Dragon Ball — used on login. */
  classic: DB,

  /** All themes shuffled — generic fallback. */
  get all() {
    return shuffle([...DB, ...DS, ...JJK, ...NARUTO, ...XIANXIA, ...BLUE_LOCK]);
  },
} as const;

export type WallpaperPlaylist = keyof typeof WALLPAPERS;
