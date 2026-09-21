# Holo illustration compositing

The home page hero (`.holo` in `src/pages/index.astro`) uses CSS blend compositing so the character appears **woven into** the rainbow holo field—not pasted on top as a black rectangle.

**Do not change this section without reading this doc.**

---

## Required assets

| File | Role |
|------|------|
| `public/holo-field.png` | Rainbow holo backdrop |
| `public/tato-illust.jpg` | Character on **black** background (JPG) |

Do **not** replace the JPG with a transparent PNG alone. PNG transparency bypasses `mix-blend-mode: lighten`, which produces a flat sticker look.

---

## Required DOM structure

```html
<section class="holo">
  <div class="holo__scene">
    <div class="holo__composite">
      <img class="holo__field" src="/holo-field.png" />
      <img class="holo__illust" src="/tato-illust.jpg" />
    </div>
  </div>
  <!-- text overlays (kicker, tag, arrow, bio, profile) -->
</section>
```

- `holo__field` and `holo__illust` must be **siblings** inside `holo__composite`.
- Do **not** move the field to `.holo::before`, a page background, or a separate stacking layer.

---

## Required CSS rules

1. **`mix-blend-mode: lighten`** on `.holo__illust` — black (0,0,0) drops out; holo shows through; character picks up holo color.
2. **No `isolation: isolate` on `.holo`** — it prevents the illust from blending with the field when they are in separate layers.
3. **`isolation: isolate` on `.holo__composite` only** — contains blend between field + illust; stops bleed onto the white page behind the section.
4. **Field and illust share one compositing group** — same parent (`.holo__composite`), field painted first, illust on top with `z-index: 1`.

---

## Common regressions (already broken this twice)

| Change | Symptom |
|--------|---------|
| `isolation: isolate` on `.holo` | Black JPG rectangle visible; no holo integration |
| Field on `.holo::before`, illust in `.holo__scene` | Blend targets transparent scene bg, not holo-field |
| Switch to PNG-only, keep lighten | Sticker-on-paper look; no “woven in” feel |
| Remove lighten / use multiply | Wrong look unless explicitly requested |

---

## Profile expand (safe to tune)

These do **not** affect core compositing:

- `--mask-fade` / `--illust-anchor` CSS variables on open/close
- `mask-image` gradient on `.holo__illust` (fade to transparent when profile opens)
- Panel `min-height` transitions

Keep mask transitions on both closed and open states (same property, different stops) so open/close does not snap.

---

## Verify after any holo edit

1. `bun run dev -- --port 4322`
2. **Closed:** character glows with holo rainbow; no black box around figure
3. **Open:** illust fades at bottom; profile text appears; illust stays top-aligned
4. Compare with a known-good screenshot if unsure
