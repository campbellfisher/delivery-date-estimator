/**
 * estimator.js — Estimated delivery-date calculator (vanilla JavaScript)
 *
 * The problem this solves:
 *   Shoppers abandon carts when a product page says "shipping calculated at
 *   checkout" and nothing else. Showing a realistic delivery *window* on the
 *   product page — before purchase — answers the question up front and cuts
 *   down on "where is my order?" (WISMO) support tickets after purchase.
 *
 * The model is deliberately simple and explainable:
 *
 *   delivery window = order date
 *                   + processing time (warehouse handling, business days)
 *                   + transit time    (carrier time, business days)
 *
 *   - If the order is placed after the daily cutoff, processing starts the
 *     next business day (the warehouse has stopped picking for today).
 *   - A range in → a range out: fastest case uses the minimums, slowest case
 *     uses the maximums, so the promise is a window, not a single date.
 *
 * Everything here is pure date math — no dependencies, no network calls.
 */

"use strict";

/* ------------------------------------------------------------------ *
 * Date helpers
 * ------------------------------------------------------------------ */

/** True when the date falls on a Saturday or Sunday. */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Add `days` business days to `date`, skipping weekends.
 * Returns a new Date; the input is not mutated.
 * addBusinessDays(friday, 1) → the following Monday.
 */
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added++;
  }
  return result;
}

/** Format a Date as e.g. "Mon, Nov 2". */
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ *
 * Core calculation
 * ------------------------------------------------------------------ */

/**
 * Estimate the delivery window for an order.
 *
 * @param {Object} config
 * @param {string} config.cutoffTime   Daily order cutoff, "HH:MM" 24-hour.
 * @param {number} config.processMin   Minimum processing days (business days).
 * @param {number} config.processMax   Maximum processing days (business days).
 * @param {number} config.transitMin   Minimum transit days (business days).
 * @param {number} config.transitMax   Maximum transit days (business days).
 * @param {Date}   [now]               Order moment (defaults to right now;
 *                                     injectable so the logic is testable).
 * @returns {{ earliest: Date, latest: Date, shipsToday: boolean }}
 */
function estimateDelivery(config, now = new Date()) {
  const [cutoffHour, cutoffMinute] = config.cutoffTime.split(":").map(Number);

  // The processing clock starts today only if we are before the cutoff.
  // After the cutoff, the first processing day is the next business day.
  const start = new Date(now);
  const pastCutoff =
    now.getHours() > cutoffHour ||
    (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMinute);

  let processingStart = start;
  if (pastCutoff || isWeekend(start)) {
    // Roll forward to the next business day.
    processingStart = addBusinessDays(start, 1);
    // addBusinessDays counts *added* days; if today is a weekday and we are
    // simply past cutoff, one business day forward is correct. If today is
    // a weekend day, addBusinessDays already lands on Monday from Saturday
    // (1 added day) — but from Sunday it also lands on Monday. Good.
  }

  const earliest = addBusinessDays(
    processingStart,
    config.processMin + config.transitMin
  );
  const latest = addBusinessDays(
    processingStart,
    config.processMax + config.transitMax
  );

  return { earliest, latest, shipsToday: !pastCutoff && !isWeekend(start) };
}

/**
 * Human-readable countdown to today's cutoff, e.g. "3 hrs 12 mins".
 * Returns null once the cutoff has passed.
 */
function timeUntilCutoff(cutoffTime, now = new Date()) {
  const [hour, minute] = cutoffTime.split(":").map(Number);
  const cutoff = new Date(now);
  cutoff.setHours(hour, minute, 0, 0);
  const diffMs = cutoff - now;
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} hrs ${minutes} mins`;
  return `${minutes} mins`;
}

/* ------------------------------------------------------------------ *
 * Widget rendering
 * ------------------------------------------------------------------ */

/**
 * Render the estimate into a DOM element.
 *
 * @param {HTMLElement} el      The widget container.
 * @param {Object}      config  Same shape as estimateDelivery's config.
 */
function renderEstimate(el, config) {
  const now = new Date();
  const { earliest, latest, shipsToday } = estimateDelivery(config, now);
  const countdown = timeUntilCutoff(config.cutoffTime, now);

  let urgencyLine;
  if (countdown && shipsToday) {
    urgencyLine = `Order within <strong>${countdown}</strong> and it ships today.`;
  } else if (shipsToday) {
    urgencyLine = `Order today and it ships today.`;
  } else {
    urgencyLine = `Orders placed now ship the next business day.`;
  }

  el.innerHTML = `
    <p class="edd-window">
      Get it between <strong>${formatDate(earliest)}</strong> and
      <strong>${formatDate(latest)}</strong>
    </p>
    <p class="edd-note">${urgencyLine}</p>
  `;
}

// Export for tests / reuse when loaded as a module; harmless in the browser.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { estimateDelivery, addBusinessDays, timeUntilCutoff, isWeekend };
}
