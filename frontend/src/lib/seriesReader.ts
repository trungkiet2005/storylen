export type SeriesTranslationMode = "overlay" | "sidebyside" | "tap";

export function buildSeriesReadPageHref(seriesId: string, pageId: string): string {
  return `/series/${encodeURIComponent(seriesId)}/read?page=${encodeURIComponent(pageId)}`;
}

export function chooseSeriesReaderImages({
  mode,
  originalImageUrl,
  translatedImageUrl,
}: {
  mode: SeriesTranslationMode;
  originalImageUrl: string | null | undefined;
  translatedImageUrl: string | null | undefined;
}): { primary: string | null; secondary: string | null } {
  if (mode === "sidebyside") {
    return {
      primary: originalImageUrl ?? translatedImageUrl ?? null,
      secondary: translatedImageUrl ?? originalImageUrl ?? null,
    };
  }

  if (mode === "tap") {
    return { primary: originalImageUrl ?? translatedImageUrl ?? null, secondary: null };
  }

  return { primary: translatedImageUrl ?? originalImageUrl ?? null, secondary: null };
}
