import assert from "node:assert/strict";
import test from "node:test";

import {
  clampFraming,
  defaultFraming,
  sourceRectFromFraming,
} from "../src/lib/epaper-preview.ts";

const image = { width: 1600, height: 960 };

test("clampFraming keeps pan source rect inside the image", () => {
  const framing = clampFraming(image, {
    ...defaultFraming(image),
    zoom: 2,
    centerX: -500,
    centerY: 5000,
  });
  const rect = sourceRectFromFraming(image, framing);
  assert.ok(rect.x >= 0);
  assert.ok(rect.y >= 0);
  assert.ok(rect.x + rect.width <= image.width + 1e-6);
  assert.ok(rect.y + rect.height <= image.height + 1e-6);
});

test("clampFraming pins centre when zoomed out past the image", () => {
  const framing = clampFraming(image, {
    centerX: 0,
    centerY: 0,
    zoom: 0.25,
  });
  assert.equal(framing.centerX, image.width / 2);
  assert.equal(framing.centerY, image.height / 2);
});
