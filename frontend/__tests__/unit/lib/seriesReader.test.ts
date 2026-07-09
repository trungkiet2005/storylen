import { describe, expect, it } from "vitest";

import {
  buildSeriesReadPageHref,
  chooseSeriesReaderImages,
} from "@/lib/seriesReader";

describe("series reader helpers", () => {
  it("keeps page links inside the series reader", () => {
    expect(buildSeriesReadPageHref("series 1", "page/2")).toBe(
      "/series/series%201/read?page=page%2F2",
    );
  });

  it("uses the original image for tap mode so bubble context stays inspectable", () => {
    expect(
      chooseSeriesReaderImages({
        mode: "tap",
        originalImageUrl: "original.png",
        translatedImageUrl: "translated.png",
      }),
    ).toEqual({ primary: "original.png", secondary: null });
  });

  it("uses both original and translated images in bilingual mode", () => {
    expect(
      chooseSeriesReaderImages({
        mode: "sidebyside",
        originalImageUrl: "original.png",
        translatedImageUrl: "translated.png",
      }),
    ).toEqual({ primary: "original.png", secondary: "translated.png" });
  });
});
