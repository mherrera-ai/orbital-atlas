import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL || "http://127.0.0.1:5173";
const OUTPUT_DIR = new URL("../artifacts/", import.meta.url);
const PLANET_COUNT = 8;
const CRITICAL_UI = [
  { selector: ".hud", label: "HUD shell" },
  { selector: ".control-deck", label: "control deck" },
  { selector: ".planet-dock", label: "planet dock" },
  { selector: "#focusName", label: "planet title", text: "Earth" },
  { selector: "#focusCopy", label: "planet summary", text: "Earth" },
  { selector: "#focusTrack", label: "distance readout", text: "DIST 1.0 AU" },
  { selector: "#focusSignal", label: "signal readout", text: "LIGHT 8.3 MIN" },
  { selector: "#missionTarget", label: "mission target", text: "Earth", desktopOnly: true },
  { selector: "#orbitScrubber", label: "orbit scrubber" },
  { selector: "#playPause", label: "play pause control" },
  { selector: "#toggleSignals", label: "signal toggle" },
  { selector: "#toggleZones", label: "zones toggle" },
  { selector: '[data-camera-view="chase"]', label: "chase camera control" }
];

await mkdir(OUTPUT_DIR, { recursive: true });

const browserIssues = [];
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await newCheckedPage(
    browser,
    {
      viewport: { width: 1440, height: 950 },
      deviceScaleFactor: 1,
      reducedMotion: "no-preference"
    },
    "desktop",
    browserIssues
  );

  await openReadyApp(desktop);
  await assertCriticalUiVisible(desktop, "desktop");
  await assertNoHorizontalOverflow(desktop, "desktop");
  await assertPlanetSelectorCoverage(desktop);
  await focusPlanet(desktop, "earth", "Earth");
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return (
      tracking?.followId === "earth" &&
      tracking.cameraMode === "chase" &&
      tracking.targetDistance < 0.12 &&
      document.querySelector('[data-planet="earth"]')?.classList.contains("is-active")
    );
  });
  await focusPlanet(desktop, "neptune", "Neptune");
  await desktop.evaluate(() => document.activeElement?.blur());
  await desktop.keyboard.press("1");
  await desktop.waitForFunction(() => document.querySelector("#focusName")?.textContent === "Mercury");
  await focusPlanet(desktop, "earth", "Earth");
  await desktop.waitForFunction(
    () => document.querySelector("#focusSignal")?.textContent === "LIGHT 8.3 MIN"
  );
  await desktop.waitForFunction(
    () =>
      document.querySelector("#focusTrack")?.textContent === "DIST 1.0 AU" &&
      /^ORBIT\s+\d{3}\s+DEG$/.test(document.querySelector("#focusLongitude")?.textContent || "")
  );
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return tracking?.followId === "earth" && tracking.activeAu === 1 && tracking.targetDistance < 0.12;
  });
  await desktop.waitForFunction(
    () => document.querySelector('[data-planet="earth"]')?.classList.contains("is-active")
  );
  await desktop.evaluate(() => {
    const scrubber = document.querySelector("#orbitScrubber");
    scrubber.value = "750";
    scrubber.dispatchEvent(new Event("input", { bubbles: true }));
    scrubber.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    const value = Number(document.querySelector("#orbitScrubber")?.value);
    return tracking?.activeProgress > 0.72 && tracking.activeProgress < 0.78 && value > 720;
  });
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return tracking?.followId === "earth" && tracking.targetDistance < 0.12;
  });
  await desktop.mouse.move(720, 470);
  await desktop.mouse.down();
  await desktop.mouse.move(770, 515, { steps: 4 });
  await desktop.mouse.up();
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return tracking?.followId === null && !document.querySelector(".planet-button.is-active");
  });
  await focusPlanet(desktop, "earth", "Earth");
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return (
      tracking?.followId === "earth" &&
      tracking.cameraMode === "chase" &&
      tracking.targetDistance < 0.12 &&
      document.querySelector('[data-planet="earth"]')?.classList.contains("is-active")
    );
  });
  await desktop.click('[data-camera-view="map"]');
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return tracking?.followId === null && tracking.cameraMode === "map";
  });
  await desktop.click('[data-camera-view="chase"]');
  await desktop.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return (
      tracking?.followId === "earth" &&
      tracking.cameraMode === "chase" &&
      tracking.targetDistance < 0.12 &&
      document.querySelector('[data-planet="earth"]')?.classList.contains("is-active")
    );
  });
  await desktop.click("#toggleSignals");
  await desktop.waitForFunction(
    () => window.__SOLAR_APP__?.getTrackingState?.().signalsVisible === false
  );
  await desktop.click("#toggleSignals");
  await desktop.waitForFunction(
    () => window.__SOLAR_APP__?.getTrackingState?.().signalsVisible === true
  );
  await desktop.click("#toggleZones");
  await desktop.waitForFunction(
    () => window.__SOLAR_APP__?.getTrackingState?.().zonesVisible === false
  );
  await desktop.click("#toggleZones");
  await desktop.waitForFunction(
    () => window.__SOLAR_APP__?.getTrackingState?.().zonesVisible === true
  );
  await desktop.click("#toggleLabels");
  await desktop.waitForFunction(() => document.querySelector(".app-shell")?.classList.contains("planet-labels-hidden"));
  await desktop.click("#toggleLabels");
  await desktop.waitForFunction(() => !document.querySelector(".app-shell")?.classList.contains("planet-labels-hidden"));
  await desktop.click("#playPause");
  await desktop.waitForFunction(() => document.querySelector("#playPause")?.getAttribute("aria-pressed") === "true");
  await desktop.click("#playPause");
  await desktop.waitForFunction(() => document.querySelector("#playPause")?.getAttribute("aria-pressed") === "false");
  await desktop.evaluate(() => window.__SOLAR_APP__.setSpeed(12));
  await desktop.waitForTimeout(650);
  const tracking = await desktop.evaluate(() => window.__SOLAR_APP__.getTrackingState());
  if (tracking.followId !== "earth" || tracking.targetDistance > 0.12) {
    throw new Error(
      `Planet follow drifted from Earth: follow=${tracking.followId}, distance=${tracking.targetDistance}`
    );
  }
  await desktop.evaluate(() => window.__SOLAR_APP__.setSpeed(1));

  const desktopSample = await assertCanvasLit(desktop, {
    minWidth: 900,
    minHeight: 600,
    label: "desktop"
  });
  await desktop.evaluate(() => document.querySelector("#toast")?.classList.remove("is-visible"));
  await desktop.waitForTimeout(220);

  await desktop.screenshot({
    path: new URL("solar-system-desktop.png", OUTPUT_DIR).pathname,
    fullPage: true
  });

  const mobile = await newCheckedPage(
    browser,
    {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 2,
      reducedMotion: "no-preference"
    },
    "mobile",
    browserIssues
  );

  await openReadyApp(mobile);
  await assertCriticalUiVisible(mobile, "mobile");
  await mobile.waitForFunction(() => {
    const copy = document.querySelector("#focusCopy");
    if (!copy) return false;
    const style = getComputedStyle(copy);
    return copy.textContent.includes("Earth") && style.display !== "none" && copy.offsetHeight > 10;
  });
  const mobileSample = await assertCanvasLit(mobile, {
    minWidth: 500,
    minHeight: 900,
    label: "mobile"
  });

  await assertNoHorizontalOverflow(mobile, "mobile");

  await mobile.screenshot({
    path: new URL("solar-system-mobile.png", OUTPUT_DIR).pathname,
    fullPage: true
  });

  assertNoBrowserIssues(browserIssues);

  console.log(
    `Visual check passed. Desktop ${desktopSample.width}x${desktopSample.height} lit ${desktopSample.litRatio.toFixed(
      4
    )}; mobile ${mobileSample.width}x${mobileSample.height} lit ${mobileSample.litRatio.toFixed(4)}.`
  );
} finally {
  await browser.close();
}

async function newCheckedPage(browserInstance, options, label, issues) {
  const page = await browserInstance.newPage(options);
  page.on("pageerror", (error) => {
    issues.push(`${label} page error: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push(`${label} console error: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (request.url().startsWith("data:") || request.url().startsWith("blob:")) {
      return;
    }

    issues.push(
      `${label} request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText || "unknown"})`
    );
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      issues.push(`${label} HTTP ${status}: ${response.url()}`);
    }
  });

  return page;
}

async function openReadyApp(page) {
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 20000 });
  await page.waitForFunction(() => window.__SOLAR_READY__ === true, {
    timeout: 20000
  });
  await page.waitForSelector(".loader.is-hidden", { state: "attached", timeout: 20000 });
  await page.waitForFunction(() => {
    const tracking = window.__SOLAR_APP__?.getTrackingState?.();
    return tracking?.followId === "earth" && tracking.cameraMode === "chase";
  });
  await page.waitForTimeout(450);
}

async function assertCriticalUiVisible(page, label) {
  const items = CRITICAL_UI.filter((item) => !(label === "mobile" && item.desktopOnly));
  const failures = await page.evaluate((items) => {
    return items.flatMap(({ selector, label: itemLabel, text }) => {
      const element = document.querySelector(selector);
      if (!element) {
        return [`${itemLabel} missing (${selector})`];
      }

      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible =
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0;

      if (!visible) {
        return [`${itemLabel} hidden (${selector})`];
      }

      if (text && !element.textContent.includes(text)) {
        return [`${itemLabel} expected "${text}", got "${element.textContent.trim()}"`];
      }

      return [];
    });
  }, items);

  if (failures.length) {
    throw new Error(`${label} UI smoke failed: ${failures.join("; ")}`);
  }
}

async function assertPlanetSelectorCoverage(page) {
  const planets = await page.$$eval("[data-planet]", (buttons) =>
    buttons.map((button) => ({
      id: button.dataset.planet,
      name: button.textContent.trim()
    }))
  );

  if (planets.length !== PLANET_COUNT) {
    throw new Error(`Expected ${PLANET_COUNT} planet selectors, found ${planets.length}.`);
  }

  for (const planet of planets) {
    await focusPlanet(page, planet.id, planet.name);
    await page.waitForFunction(
      (id) => window.__SOLAR_APP__?.getTrackingState?.().activeId === id,
      planet.id
    );
  }
}

async function focusPlanet(page, id, expectedName) {
  await page.click(`[data-planet="${id}"]`);
  await page.waitForFunction(
    ({ id: planetId, expected }) => {
      const tracking = window.__SOLAR_APP__?.getTrackingState?.();
      const button = document.querySelector(`[data-planet="${planetId}"]`);
      return (
        document.querySelector("#focusName")?.textContent === expected &&
        tracking?.activeId === planetId &&
        tracking.followId === planetId &&
        button?.classList.contains("is-active")
      );
    },
    { id, expected: expectedName }
  );
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  );

  if (overflow > 2) {
    throw new Error(`${label} layout overflows horizontally by ${overflow}px`);
  }
}

async function assertCanvasLit(page, { minWidth, minHeight, label }) {
  const sample = await page.evaluate(() => window.__SOLAR_SAMPLE_CANVAS__());

  if (sample.width < minWidth || sample.height < minHeight) {
    throw new Error(`${label} canvas is too small: ${sample.width}x${sample.height}`);
  }

  if (sample.litRatio < 0.015) {
    throw new Error(
      `${label} canvas looks blank. Lit pixel ratio was ${sample.litRatio.toFixed(4)}`
    );
  }

  if (sample.brightPixels < 20) {
    throw new Error(`${label} canvas lacks bright rendered detail: ${sample.brightPixels}`);
  }

  return sample;
}

function assertNoBrowserIssues(issues) {
  if (issues.length) {
    throw new Error(`Browser issues detected:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  }
}
