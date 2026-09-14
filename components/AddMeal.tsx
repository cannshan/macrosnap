"use client";

import { useRef, useState } from "react";
import { ItemList, useItems } from "@/components/ItemList";
import { MacroChips } from "@/components/Macro";
import { SlotPicker } from "@/components/SlotPicker";
import { toDataUrl } from "@/lib/image";
import { round, slotForNow, totalOf, type MealSlot } from "@/lib/types";

type Stage = "pick" | "ready" | "analyzing" | "review";

export function AddMeal({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("pick");
  const [image, setImage] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slot, setSlot] = useState<MealSlot>("lunch");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const list = useItems();

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStage("pick");
    setImage(null);
    setHint("");
    setError(null);
    setName("");
    setNotes("");
    setSaving(false);
    list.reset([]);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so picking the same file twice still fires a change event.
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      setImage(await toDataUrl(file));
      setStage("ready");
    } catch {
      setError("Could not read that image. Try another photo.");
    }
  }

  async function analyze() {
    if (!image) return;
    setStage("analyzing");
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, hint }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analysis failed.");

      setName(data.mealName);
      setNotes(data.notes ?? "");
      setSlot(slotForNow());
      list.reset(data.items);
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStage("ready");
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slot, items: list.items, notes, image }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Could not save this meal.");
      }
      close();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this meal.");
      setSaving(false);
    }
  }

  const totals = totalOf(list.items);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-cal text-ink shadow-lg shadow-cal/25 transition active:scale-95"
        aria-label="Log a meal from a photo"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
          <path d="M9 3h6l1.6 2H20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.4zM12 9a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-sm">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold">
              {stage === "review" ? "Check the estimate" : "Log a meal"}
            </h2>
            <button
              onClick={close}
              className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-white"
            >
              Cancel
            </button>
          </header>

          <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-5">
            {error && (
              <p className="mb-4 rounded-xl border border-fat/30 bg-fat/10 px-4 py-3 text-sm text-fat">
                {error}
              </p>
            )}

            {image && (
              <div className="relative mb-5 overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="The meal you photographed" className="w-full object-cover" />
                {stage === "analyzing" && <div className="shimmer absolute inset-0 bg-ink/45" />}
              </div>
            )}

            {stage === "pick" && (
              <div className="space-y-3 pt-8">
                <p className="pb-4 text-center text-sm leading-relaxed text-muted">
                  Shoot the plate from above at a slight angle, with a fork or your hand in
                  frame. Scale is what the estimate hangs on.
                </p>
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="w-full rounded-2xl bg-cal py-4 font-semibold text-ink transition active:scale-[0.99]"
                >
                  Take a photo
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="w-full rounded-2xl border border-line bg-surface py-4 font-semibold transition active:scale-[0.99]"
                >
                  Choose from library
                </button>
              </div>
            )}

            {stage === "ready" && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted">
                    Anything the photo misses? (optional)
                  </span>
                  <input
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="cooked in 2 tbsp olive oil, brown rice"
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none transition focus:border-cal"
                  />
                </label>
                <button
                  onClick={analyze}
                  className="w-full rounded-2xl bg-cal py-4 font-semibold text-ink transition active:scale-[0.99]"
                >
                  Analyze macros
                </button>
                <button
                  onClick={reset}
                  className="w-full py-2 text-sm text-muted transition hover:text-white"
                >
                  Use a different photo
                </button>
              </div>
            )}

            {stage === "analyzing" && (
              <div className="space-y-3 py-2">
                <p className="text-center text-sm text-muted">
                  Reading the plate and estimating portions…
                </p>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="shimmer relative h-20 overflow-hidden rounded-2xl border border-line bg-surface"
                  />
                ))}
              </div>
            )}

            {stage === "review" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-lg font-semibold outline-none"
                    aria-label="Meal name"
                  />
                  <div className="mt-3">
                    <SlotPicker value={slot} onChange={setSlot} />
                  </div>
                  <div className="mt-4 border-t border-line pt-3">
                    <MacroChips {...totals} />
                  </div>
                </div>

                {notes && (
                  <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
                    {notes}
                  </p>
                )}

                <p className="text-center text-xs text-muted">
                  Tap any food to correct what it is, its weight, or its macros.
                </p>

                <ItemList
                  list={list}
                  emptyMessage="You removed every item. Add one, or retake the photo."
                />
              </div>
            )}
          </div>

          {stage === "review" && (
            <footer
              className="border-t border-line bg-surface px-4 py-3"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto max-w-lg">
                <button
                  onClick={save}
                  disabled={saving || list.items.length === 0}
                  className="w-full rounded-2xl bg-cal py-4 font-semibold text-ink transition active:scale-[0.99] disabled:opacity-40"
                >
                  {saving ? "Saving…" : `Log ${round(totals.calories)} kcal`}
                </button>
              </div>
            </footer>
          )}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            className="hidden"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
        </div>
      )}
    </>
  );
}
