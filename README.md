# Delivery Date Estimator

A small, dependency-free demo of an estimated-delivery-date widget for an e-commerce product page — the concept behind my Shopify app **Voodoo**.

![Concept](https://img.shields.io/badge/vanilla-JavaScript-yellow) ![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

## The problem

Most product pages say nothing about arrival time until checkout. That silence costs merchants twice:

1. **Before the sale** — shoppers who can't tell when an item will arrive abandon the cart, especially around birthdays, holidays, and deadlines.
2. **After the sale** — "Where is my order?" (WISMO) becomes one of the most common support tickets, even when the package is moving exactly on schedule. The shopper was never given an expectation to measure against.

A realistic delivery **window** on the product page — shown before purchase — sets the expectation at the moment it matters.

## How it works

The estimate is simple, explainable date math (see `estimator.js`):

```
delivery window = order date + processing days + transit days
```

- **Processing** is the merchant's warehouse handling time; **transit** is the carrier's time. Both are ranges, so the output is a window, not a single over-promised date.
- **Cutoff time:** an order placed after the daily cutoff (e.g. 2:00 PM) starts processing the next business day — the warehouse has stopped picking for today.
- **Business days only:** weekends are skipped when counting processing and transit days.
- The widget also renders an urgency line ("Order within 3 hrs 12 mins and it ships today") that recalculates every minute while the page is open.

The core function, `estimateDelivery(config, now)`, is pure — pass it a config and a moment in time, get a window back. That makes it trivial to unit-test and easy to explain: the demo page is just a rendering of that one function.

## Run it

No build step, no server required:

```bash
# Option 1: open the file directly
open index.html

# Option 2: serve it (nicer for the countdown refresh)
npx serve .
```

Then change the merchant settings at the bottom of the page — cutoff, processing range, transit range — and watch the estimate update.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Product-page-style demo and the control wiring |
| `estimator.js` | The date math and widget rendering (the interesting part) |
| `styles.css` | Quiet, store-like styling |

## Where it would go in production

In a real Shopify store, the config would come from the merchant's fulfilment settings (shop or product metafields) rendered by the theme, and the widget would sit in the product information block next to the buy buttons — exactly where it sits in this demo.
