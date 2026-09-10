import assert from "node:assert/strict";
import { test } from "node:test";
import { waveshare75BwProfile } from "@singleton-sd/inkads-epaper-renderer";
import {
  defaultFraming,
  panFraming,
} from "../src/lib/epaper-preview.ts";

const profile = waveshare75BwProfile;

test("pan at cover-fit on panel-sized image zooms in then moves", () => {
  const image = { width: 800, height: 480 };
  const start = defaultFraming(image);
  const next = panFraming(image, start, profile, "e", { step: 0.25 });

  assert.ok(next.zoom > start.zoom, "expected auto zoom-in to create pan slack");
  assert.notEqual(next.centerX, start.centerX);
});

test("pan on a cropped axis at zoom 1 moves without forcing zoom", () => {
  const image = { width: 1920, height: 1080 };
  const start = defaultFraming(image);
  const next = panFraming(image, start, profile, "e", { step: 0.25 });

  assert.equal(next.zoom, start.zoom);
  assert.notEqual(next.centerX, start.centerX);
});

test("vertical pan works on square cover-fit when horizontal is locked", () => {
  const image = { width: 1200, height: 1200 };
  const start = defaultFraming(image);
  const east = panFraming(image, start, profile, "e", { step: 0.25 });
  const south = panFraming(image, start, profile, "s", { step: 0.25 });

  // East is locked at zoom 1 → helper zooms then pans.
  assert.ok(east.zoom > 1 || east.centerX !== start.centerX);
  assert.equal(south.zoom, 1);
  assert.notEqual(south.centerY, start.centerY);
});
