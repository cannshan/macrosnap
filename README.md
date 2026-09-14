# MacroSnap

Photograph a meal, get its macros, track your day. A mobile-first web app that
runs on your own machine — Claude reads the photo, you check the estimate, it
goes into your daily totals.

## Setup

1. Get an API key at [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Create `.env.local` in this folder:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Start it:

   ```bash
   npm run dev
   ```

Open `http://localhost:3001`.

### Using it from your phone

The dev server binds to `0.0.0.0`, so any device on the same Wi-Fi can reach it.
Find your machine's LAN address and visit `http://<that-address>:3001` on your
phone, then use Safari's **Share → Add to Home Screen** (or Chrome's
**Install app**) to get a full-screen icon with no browser chrome.

```bash
ipconfig | findstr IPv4
```

The camera button opens the real camera on a phone and a file picker on a desktop.

## How it works

Take a photo → Claude identifies each food, estimates its portion, and returns
macros → you review and adjust before it is logged. Nothing is saved until you
tap the log button.

- **Today** — calorie ring, macro bars, and the meals you have logged. Tap a meal
  to see its per-item breakdown or delete it.
- **History** — the last 14 days grouped by day, with a daily average.
- **Goals** — your daily targets. It flags when your macro split and your calorie
  target disagree by more than 5%.

### The estimate

Portion size is the hard part, not food identification, so the prompt in
[lib/analyze.ts](lib/analyze.ts) leans on it:

- Scale is anchored to objects in frame — plate diameter, a fork, a can.
- Weights are edible weight as served, cooked, bones excluded.
- Cooking oil and butter you cannot see are counted explicitly. This is the
  single largest source of under-reporting in photo-based tracking, and the model
  is told not to skip it.
- Every item carries a `high` / `medium` / `low` confidence badge, so you know
  which numbers to double-check.
- The macro math is kept self-consistent — 4/4/9 has to land within ~10% of the
  stated calories.

### Correcting it

Nothing the model returns is locked. Tap any food in the review screen and it
opens into a full editor:

- **What it is** — retype the name and the portion description. It guessed white
  rice, you ate brown.
- **Weight** — type the real gram weight and every macro rescales with it. This
  is the common case: the identity was right, the portion was off.
- **Any macro directly** — calories, protein, carbs, fat, fiber. Reading off a
  package label beats any estimate, and a hand-entered number stops being
  rescaled from then on.
- **Add a food it missed** — the butter under the rice, the drink beside the
  plate, the dressing already mixed in.
- **Remove a food that isn't there.**

There is also a **portion slider** on each item for a quick 25%–250% rescale
without opening the editor, and the **hint field** before analysis, which lets
you tell it what the photo cannot show ("cooked in 2 tbsp olive oil", "that's
brown rice"). Hints override the model's own read and are the cheapest accuracy
win available.

Meals already in your log are editable too — tap one, hit **Edit meal**, and the
day's totals recalculate when you save.

Expect estimates to be good enough to track trends and stay roughly on target.
They are not a substitute for a food scale if you need real precision.

## Where your data lives

Everything is on this machine. `data/macrosnap.db` is a SQLite file holding your
meals and goals; `data/photos/` holds the meal photos. Deleting a meal deletes
its photo. There are no accounts and nothing syncs anywhere — the only thing that
leaves your machine is the photo you choose to analyze, which goes to the
Anthropic API for that one request.

To back up or move your log, copy the `data/` folder.

## Cost

Measured, not estimated — the server logs `[analyze] in=... out=... cost=$...`
for every photo:

| Meal | Input | Output | Cost |
|---|---|---|---|
| Salmon, rice, broccoli (4 items) | 3,134 | 454 | $0.027 |
| Lamb tagine, 7 items, with a hint | 3,176 | 824 | $0.037 |

Call it **3 cents a photo**. Input is nearly constant because the downscaled
image dominates it; output grows with how many foods are on the plate and how
much reasoning the portions need.

At three meals a day that is about **$2.70/month**, or **$33/year**. Photos are
resized to 1280px in the browser first, so you are never paying to upload an 8MB
camera original.

Prompt caching does not help here: the image changes every request and the
system prompt is below the minimum cacheable prefix, so there is no stable
prefix to cache.

`lib/analyze.ts` sets `effort: "medium"`, which keeps a photo under roughly 15
seconds. Raise it to `"high"` for tighter estimates at the cost of latency.

## Layout

```
app/
  page.tsx            Today — ring, bars, meal list
  history/page.tsx    Last 14 days
  goals/page.tsx      Daily targets
  api/
    analyze/          photo -> macros (Claude)
    meals/            log, list, edit, delete
    goals/            read and update targets
    photos/           serve saved meal photos
components/
  AddMeal.tsx         capture -> analyze -> review -> save
  MealCard.tsx        one logged meal
  Macro.tsx           calorie ring, macro bars, chips
  Nav.tsx             bottom tab bar
lib/
  analyze.ts          the vision prompt and structured-output schema
  db.ts               SQLite
  types.ts            shared types and macro math
  image.ts            browser-side downscaling
```

## Worth knowing

- The dev server runs on **3001** because 3000 was already in use on this machine.
  Change it in `package.json` if you'd rather have 3000.
- `npm run build && npm start` runs the production build, which is noticeably
  faster on a phone than the dev server.
- Days are local calendar days, so a 9pm dinner lands on today, not tomorrow.
