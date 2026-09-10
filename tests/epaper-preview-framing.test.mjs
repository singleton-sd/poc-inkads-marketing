import assert from "node:assert/strict";
import { test } from "node:test";
import { waveshare75BwProfile } from "@singleton-sd/inkads-epaper-renderer";
import {
  defaultFraming,
  framingPanRoom,
  panFraming,
} from "../src/lib/epaper-preview.ts";

const profile = waveshare75BwProfile;

test("pan at cover-fit on panel-sized image is a no-op (arrows disabled)", () => {
  const image = { width: 800, height: 480 };
  const start = defaultFraming(image);
  const next = panFraming(image, start, profile, "e", { step: 0.25 });
  const room = framingPanRoom(image, start, profile);

  assert.equal(next.centerX, start.centerX);
  assert.equal(room.east, 0);
  assert.equal(room.west, 0);
});

test("pan on a cropped axis at zoom 1 moves without changing zoom", () => {
  const image = { width: 1920, height: 1080 };
  const start = defaultFraming(image);
  const next = panFraming(image, start, profile, "e", { step: 0.25 });

  assert.equal(next.zoom, start.zoom);
  assert.notEqual(next.centerX, start.centerX);
});

test("letterboxed image can be offset inside the frame", () => {
  const image = { width: 800, height: 480 };
  const start = { ...defaultFraming(image), zoom: 0.5 };
  const room = framingPanRoom(image, start, profile);
  assert.ok(room.east > 0);
  assert.ok(room.west > 0);

  const next = panFraming(image, start, profile, "e", { step: 0.25 });
  assert.equal(next.zoom, start.zoom);
  assert.notEqual(next.centerX, start.centerX);

  // Walk to the east edge — room should hit zero.
  let framing = next;
  for (let i = 0; i < 20; i += 1) {
    framing = panFraming(image, framing, profile, "e", { step: 0.25 });
  }
  const atEdge = framingPanRoom(image, framing, profile);
  assert.ok(atEdge.east < 1e-6);
  assert.ok(atEdge.west > 0);
});

test("vertical pan works on square cover-fit when horizontal is locked", () => {
  const image = { width: 1200, height: 1200 };
  const start = defaultFraming(image);
  const eastRoom = framingPanRoom(image, start, profile);
  const south = panFraming(image, start, profile, "s", { step: 0.25 });

  assert.equal(eastRoom.east, 0);
  assert.equal(south.zoom, 1);
  assert.notEqual(south.centerY, start.centerY);
});
