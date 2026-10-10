/*!
 * Sortes Sacrae · stylesheet — Medieval Manuscript edition
 *
 * Emitted as a shared external file (`/tarot/assets/tarot.css`) so every page
 * of the little app renders standalone from the same source of truth.
 *
 * Visual language: a 15th-century illuminated manuscript — warm parchment, gold
 * leaf double rules, deep-red rubricated titles, brown ink, vine-free corner
 * flourishes and a great gilded initial on every heading. No gradients, no
 * glass, no neon, no pure black or white; buttons press like a wax seal and
 * gold borders shimmer slowly in candlelight.
 */

export function buildStyles(): string {
  return `
/* ========================================================== Foundations == */

*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}

:root{
  --parchment:#f0e6d0;
  --parchment-2:#e7d9b6;
  --parchment-3:#f7f0e1;

  --gold:#c9a74e;
  --gold-hi:#dfbf66;
  --gold-deep:#a9852f;

  --red:#8b1a1a;
  --red-dk:#6f1414;

  --brown:#3d2b1f;
  --brown-soft:#5b4632;
  --green:#2d4a2d;

  --ink:#3d2b1f;
  --ink-soft:#5b4632;
  --ink-faint:rgba(61,43,31,.62);

  --line:rgba(61,43,31,.28);
  --line-soft:rgba(61,43,31,.16);

  --radius:3px;            /* rounded-sm — never xl */
  --serif:Georgia,"Times New Roman","Songti SC","STSong","Noto Serif SC","Source Han Serif SC",serif;
  --wrap:1080px;
  --ease:cubic-bezier(.4,0,.2,1);
  --dur:.4s;              /* manuscript stillness: slow, never < 300ms */
}

body{
  margin:0;min-height:100vh;
  font-family:var(--serif);font-size:17px;line-height:1.8;
  color:var(--ink);
  background-color:var(--parchment);
  /* radial overlays only — the mottled skin of vellum, not a colour gradient */
  background-image:
    radial-gradient(900px 600px at 50% -10%,rgba(201,167,78,.10),transparent 60%),
    radial-gradient(700px 500px at 8% 12%,rgba(139,26,26,.06),transparent 62%),
    radial-gradient(700px 500px at 92% 8%,rgba(45,74,45,.06),transparent 62%);
  background-attachment:fixed;
}

a{color:var(--red);text-decoration:none}
a:hover{color:var(--gold-deep);text-decoration:underline;text-underline-offset:3px}

:focus-visible{outline:2px solid var(--gold-deep);outline-offset:3px;border-radius:2px}
::selection{background:rgba(201,167,78,.28);color:var(--ink)}

img,svg{display:block;max-width:100%}

/* ============================================================== Layout == */

.wrap{max-width:var(--wrap);margin:0 auto;padding:0 20px}
.shell{padding-bottom:72px}

.ornament{
  display:flex;align-items:center;justify-content:center;gap:1rem;
  margin:38px 0;color:var(--gold);font-size:1rem;letter-spacing:.5em;
}
.ornament::before,.ornament::after{content:"";flex:1;height:0;border-top:1px solid var(--gold)}

/* ============================================================== Header == */

.vault-head{
  position:sticky;top:0;z-index:40;
  border-bottom:4px double var(--gold);
  background:var(--parchment-2);
}
.vault-head__inner{
  max-width:var(--wrap);margin:0 auto;padding:12px 20px;
  display:flex;align-items:center;gap:18px;flex-wrap:wrap;
}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none;min-width:0}
.brand__mark{
  display:grid;place-items:center;width:38px;height:38px;border-radius:50%;
  border:3px double var(--gold);color:var(--gold);font-size:1.1rem;
  background:var(--parchment-3);
}
.brand__text{display:flex;flex-direction:column;line-height:1.15;min-width:0}
.brand__title{font-size:1.04rem;font-weight:700;letter-spacing:.14em;color:var(--ink)}
.brand__latin{font-size:.6rem;letter-spacing:.34em;text-transform:uppercase;color:var(--gold-deep)}

.nav{margin-left:auto;display:flex;gap:2px;flex-wrap:wrap;align-items:center}
.nav__link{
  position:relative;display:inline-block;padding:6px 12px;border-radius:var(--radius);
  font-size:.86rem;letter-spacing:.1em;color:var(--brown-soft);text-decoration:none;
  transition:color var(--dur) var(--ease),background var(--dur) var(--ease);
}
.nav__link:hover{color:var(--red);background:rgba(201,167,78,.12)}
.nav__link[aria-current="page"]{color:var(--red);background:rgba(201,167,78,.16)}
.nav__link[aria-current="page"]::after{
  content:"";position:absolute;left:12px;right:12px;bottom:2px;height:2px;background:var(--gold);
}

/* ================================================================ Hero == */

.hero{text-align:center;padding:60px 0 16px}
.hero__latin{
  font-size:.66rem;letter-spacing:.5em;text-transform:uppercase;
  color:var(--gold-deep);margin:0 0 8px;
}
.hero__title{
  margin:0;font-size:clamp(2.4rem,6vw,3.6rem);font-weight:700;letter-spacing:.1em;color:var(--red);
}
.hero__motto{
  max-width:42ch;margin:22px auto 0;color:var(--brown-soft);font-style:italic;font-size:1.05rem;
}

/* =========================================================== Drop caps == */

.dropcap::first-letter,.section__head h1::first-letter{
  color:var(--gold);font-weight:700;
}
.section__head h1::first-letter{
  font-size:2.6em;line-height:.8;margin-right:.06em;vertical-align:-.06em;
}
.hero__title .dropcap::first-letter{
  float:left;font-size:3.2em;line-height:.8;margin:.02em .16em 0 0;
}
.panel__title .dropcap::first-letter,
.entry__name .dropcap::first-letter,
.modal__title .dropcap::first-letter{
  float:left;font-size:2.6em;line-height:.82;margin:.02em .12em 0 0;
}

/* =============================================================== Panel == */

.panel{
  position:relative;border:4px double var(--gold);border-radius:var(--radius);
  background:var(--parchment-3);padding:26px 26px 28px;
  box-shadow:3px 3px 0 rgba(61,43,31,.18);
}
.panel--tight{padding:20px}
.panel--illum{background:var(--parchment-3)}
/* corner flourishes — the vine hint at the head of the page */
.panel::before,.panel::after{
  content:"";position:absolute;width:16px;height:16px;border:2px solid var(--gold);pointer-events:none;
}
.panel::before{top:8px;left:8px;border-right:none;border-bottom:none}
.panel::after{top:8px;right:8px;border-left:none;border-bottom:none}

.panel__title{
  margin:0 0 6px;font-size:1.34rem;font-weight:700;letter-spacing:.06em;color:var(--red);
  display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;
}
.panel__latin{font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;color:var(--gold-deep)}
.panel__lead{margin:0 0 20px;color:var(--brown-soft);font-size:.96rem}

.section{margin-top:56px}
.section__head{
  display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:20px;
}
.section__head h1,.section__head h2{
  margin:0;font-size:1.5rem;font-weight:700;letter-spacing:.1em;color:var(--red);
}
.section__head p{margin:0;color:var(--ink-faint);font-size:.84rem;letter-spacing:.04em}

/* Prose defaults inside panels and notes (the about page carries the reading). */
.panel p{margin:0 0 12px}
.panel p:last-child{margin-bottom:0}
.panel ul,.panel ol{margin:10px 0 0;padding-left:1.4rem;color:var(--brown-soft);font-size:.94rem}
.panel li{margin:8px 0}
.panel li b,.note li b{color:var(--ink)}
.note ul,.note ol{margin:0;padding-left:1.3rem}
.note li{margin:6px 0}
.note p{margin:0 0 10px}
.note p:last-child{margin-bottom:0}
code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:.86em;padding:1px 5px;border-radius:3px;
  background:rgba(201,167,78,.18);color:var(--gold-deep);
}

.grid{display:grid;gap:18px}
.grid--2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.grid--3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}

/* ============================================================= Buttons == */

.btn{
  --btn-fg:var(--parchment);
  display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
  font-family:var(--serif);font-size:.84rem;letter-spacing:.16em;text-transform:uppercase;
  padding:.7rem 1.3rem;border-radius:var(--radius);cursor:pointer;
  border:4px double var(--gold);background:var(--red);color:var(--btn-fg);
  text-decoration:none;white-space:nowrap;
  box-shadow:2px 2px 0 var(--brown);
  transition:color var(--dur) var(--ease),background var(--dur) var(--ease),
             border-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease);
}
/* Gold Leaf Shimmer — the gold rule brightens and the shadow deepens, but the
   card itself never floats (Parchment Stillness). */
.btn:hover{border-color:var(--gold-hi);box-shadow:5px 5px 0 var(--brown);color:var(--parchment)}
/* Wax Seal Impact — a hard downward-right press. */
.btn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--brown)}
.btn--gold{background:var(--gold);color:var(--brown);border-color:var(--brown)}
.btn--gold:hover{background:var(--gold-hi);color:var(--brown);border-color:var(--brown)}
.btn--quiet{background:transparent;color:var(--brown);border-color:var(--brown)}
.btn--quiet:hover{background:rgba(139,26,26,.08);border-color:var(--gold-hi);color:var(--red)}
.btn--danger{background:var(--red);color:var(--parchment);border-color:var(--brown)}
.btn--danger:hover{background:var(--red-dk);border-color:var(--gold-hi)}
.btn[disabled],.btn[aria-disabled="true"]{
  opacity:.5;cursor:not-allowed;pointer-events:none;transform:none;box-shadow:1px 1px 0 var(--brown);
}

.btn-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}

/* =============================================================== Chips == */

.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{
  font-family:var(--serif);font-size:.82rem;letter-spacing:.06em;
  padding:.45rem 1rem;border-radius:var(--radius);cursor:pointer;
  border:2px solid var(--line);background:var(--parchment-3);color:var(--brown-soft);
  transition:all var(--dur) var(--ease);
}
.chip:hover{color:var(--red);border-color:var(--gold-hi)}
.chip[aria-pressed="true"]{background:var(--gold);color:var(--brown);border-color:var(--brown);font-weight:700}

/* ======================================================= Spread picker == */

.spread-card{
  display:flex;flex-direction:column;gap:10px;text-decoration:none;
  padding:22px 22px 20px;border-radius:var(--radius);
  border:4px double var(--gold);background:var(--parchment-3);
  box-shadow:2px 2px 0 rgba(61,43,31,.16);
  transition:border-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease);
}
.spread-card:hover{border-color:var(--gold-hi);box-shadow:5px 5px 0 var(--brown);color:var(--ink)}
.spread-card__seal{
  width:38px;height:38px;border-radius:50%;display:grid;place-items:center;
  border:2px double var(--gold);color:var(--red);font-size:.9rem;background:var(--parchment-2);
}
.spread-card__name{margin:0;font-size:1.1rem;font-weight:700;letter-spacing:.08em;color:var(--red)}
.spread-card__latin{font-size:.6rem;letter-spacing:.3em;text-transform:uppercase;color:var(--gold-deep)}
.spread-card__summary{margin:0;color:var(--brown-soft);font-size:.9rem}
.spread-card__foot{
  margin-top:auto;padding-top:12px;border-top:1px solid var(--line);
  font-size:.74rem;color:var(--ink-faint);display:flex;justify-content:space-between;gap:10px;
}

/* ======================================================== Tarot cards == */

.card{
  position:relative;aspect-ratio:5/8;border-radius:var(--radius);
  border:4px double var(--gold);overflow:hidden;
  background:var(--parchment-3);
  box-shadow:2px 2px 0 rgba(61,43,31,.18);
}
.card::before,.card::after{
  content:"";position:absolute;width:12px;height:12px;border:2px solid var(--gold);pointer-events:none;z-index:2;
}
.card::before{top:5px;left:5px;border-right:none;border-bottom:none}
.card::after{top:5px;right:5px;border-left:none;border-bottom:none}
.card__numeral{
  position:absolute;top:7px;left:0;right:0;text-align:center;
  font-size:.62rem;letter-spacing:.22em;color:var(--gold-deep);text-transform:uppercase;z-index:1;
}
.card__art{
  position:absolute;inset:0;padding:24px 9px 12px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;
  transition:transform var(--dur) var(--ease);
}
.card__sigil{width:50%;max-width:62px;color:var(--accent,var(--gold-deep));opacity:.92}
.card__sigil svg{width:100%;height:auto}
.card__name{font-size:.84rem;letter-spacing:.02em;text-align:center;line-height:1.3;font-weight:600;color:var(--ink)}
.card__name::first-letter{font-size:1.7em;line-height:.8;color:var(--gold);font-weight:700}
.card__suit{font-size:.56rem;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint)}
.card--minor{--accent:var(--red)}
.card--wands{--accent:#9c3b1b}
.card--cups{--accent:#2f4a6b}
.card--swords{--accent:#4a4a52}
.card--pentacles{--accent:#6b5a2a}
.card--major{--accent:var(--gold-deep)}
/* Reversed: the artwork is upside down, exactly like a real reading. */
.card.is-reversed .card__art{transform:rotate(180deg)}

/* Back of the deck — a parchment medallion with a cross. */
.card--back{background:var(--parchment-2)}
.card--back .card__back{position:absolute;inset:0;display:grid;place-items:center}
.card__back-mark{
  font-size:2rem;color:var(--gold);border:3px double var(--gold);border-radius:50%;
  width:54%;aspect-ratio:1;display:grid;place-items:center;
}

/* Calm fade-in for a freshly drawn card (no float, no 3-D flourish). */
.card-reveal{animation:fadein .5s var(--ease) both}

/* ============================================================== Slots == */

.slot{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0}
.slot__stage{position:relative;width:100%;max-width:190px}
.slot__stage::before{content:"";display:block;padding-top:160%}
.slot__label{font-size:.74rem;letter-spacing:.14em;color:var(--red);text-align:center;font-weight:600}
.slot__hint{font-size:.78rem;color:var(--ink-faint);text-align:center;max-width:22ch}
.slot--empty .slot__stage{border:2px dashed var(--line);border-radius:var(--radius)}
.slot--empty .slot__stage::after{
  content:attr(data-ordinal);position:absolute;inset:0;display:grid;place-items:center;
  font-size:1.4rem;color:var(--gold-deep);
}
.slot--pickable{cursor:pointer}
.slot--pickable .slot__stage{border:2px solid var(--gold);box-shadow:3px 3px 0 rgba(61,43,31,.2)}
.slot.is-next .slot__label{color:var(--gold-deep)}

/* ====================================================== Spread layout == */

.spread{display:grid;gap:26px 18px;justify-items:center;grid-template-columns:1fr}

@media (min-width:640px){
  .spread--tria{grid-template-columns:repeat(3,minmax(0,1fr))}
  .spread--viae{grid-template-columns:repeat(3,minmax(0,1fr))}
  .spread--rosarium{grid-template-columns:repeat(4,minmax(0,1fr))}
  .spread--signum .slot{max-width:220px}
}

@media (min-width:760px){
  /* Five-card cross: centre with the four arms around it. */
  .spread--crux{
    grid-template-columns:repeat(3,minmax(0,1fr));
    grid-template-rows:auto auto auto;
    align-items:center;
  }
  .spread--crux .slot:nth-child(1){grid-area:2/2}
  .spread--crux .slot:nth-child(2){grid-area:1/2}
  .spread--crux .slot:nth-child(3){grid-area:3/2}
  .spread--crux .slot:nth-child(4){grid-area:2/1}
  .spread--crux .slot:nth-child(5){grid-area:2/3}
}

@media (min-width:900px){
  /* Big cross: the upright post in column 2, the staff of four on the right.
     Cards never overlap — a rotated "crossing" card would collide with its
     neighbours and is unreadable at small card sizes, so 阻力 sits directly
     under 现况 instead, with the label carrying the crossing meaning. */
  .spread--magnus{
    grid-template-columns:repeat(4,minmax(0,1fr));
    grid-template-rows:repeat(4,auto);
    align-items:center;
  }
  .spread--magnus .slot:nth-child(5){grid-area:1/2}
  .spread--magnus .slot:nth-child(1){grid-area:2/2}
  .spread--magnus .slot:nth-child(2){grid-area:3/2}
  .spread--magnus .slot:nth-child(3){grid-area:4/2}
  .spread--magnus .slot:nth-child(4){grid-area:2/1}
  .spread--magnus .slot:nth-child(6){grid-area:2/3}
  .spread--magnus .slot:nth-child(7){grid-area:4/4}
  .spread--magnus .slot:nth-child(8){grid-area:3/4}
  .spread--magnus .slot:nth-child(9){grid-area:2/4}
  .spread--magnus .slot:nth-child(10){grid-area:1/4}
}

/* ======================================================== Draw table == */

.table-head{
  display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;
  justify-content:space-between;margin-bottom:22px;
}
.field{display:flex;flex-direction:column;gap:6px;min-width:0}
.field__label{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-deep)}
.input{
  font-family:var(--serif);font-size:.94rem;color:var(--ink);
  padding:.6rem .9rem;border-radius:var(--radius);
  border:2px solid var(--line);background:rgba(240,230,208,.85);min-width:240px;
}
.input::placeholder{color:var(--ink-faint)}
.input:focus{border-color:var(--gold);outline:none}
.switch{display:flex;align-items:center;gap:8px;font-size:.88rem;color:var(--brown-soft);cursor:pointer}
.switch input{accent-color:var(--red);width:16px;height:16px;cursor:pointer}

.deck-pile{
  display:grid;gap:8px;justify-items:center;
  grid-template-columns:repeat(auto-fill,minmax(56px,1fr));
  padding:20px;border-radius:var(--radius);
  border:4px double var(--gold);background:var(--parchment-2);
}
.deck-pile .card{border-radius:var(--radius)}
.deck-pile .card__numeral,.deck-pile .card__art{display:none}
.pile-btn{
  position:relative;aspect-ratio:5/8;border-radius:var(--radius);border:2px solid var(--gold);
  background:var(--parchment-3);cursor:pointer;padding:0;
  transition:border-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease);
}
.pile-btn:hover{border-color:var(--gold-hi);box-shadow:3px 3px 0 rgba(61,43,31,.25)}
.pile-btn[disabled]{opacity:.4;cursor:not-allowed}
.deck-pile.is-shuffling .pile-btn{animation:shuffle .9s var(--ease) both;animation-delay:calc(var(--i)*12ms)}

.progress{font-size:.82rem;letter-spacing:.1em;color:var(--ink-faint);text-align:center;margin:18px 0 0}
.progress strong{color:var(--red);font-weight:700}

/* ========================================================== Synthesis == */

.stats{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.stat{border:2px solid var(--line);border-radius:var(--radius);padding:14px 16px;background:var(--parchment-3)}
.stat__label{font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-deep)}
.stat__value{font-size:1.8rem;line-height:1.2;font-weight:700;color:var(--red)}
.stat__note{font-size:.8rem;color:var(--ink-faint)}

.meter{display:flex;flex-direction:column;gap:9px;margin-top:6px}
.meter__row{display:grid;grid-template-columns:6rem 1fr 2.4rem;gap:10px;align-items:center;font-size:.82rem}
.meter__name{color:var(--brown-soft);letter-spacing:.08em}
.meter__track{height:8px;border-radius:99px;background:rgba(61,43,31,.16);overflow:hidden}
.meter__fill{height:100%;border-radius:99px;background:var(--gold-deep)}
.meter__fill--wands{background:#9c3b1b}
.meter__fill--cups{background:#2f4a6b}
.meter__fill--swords{background:#4a4a52}
.meter__fill--pentacles{background:#6b5a2a}
.meter__fill--major{background:var(--gold-deep)}
.meter__num{text-align:right;color:var(--ink-faint)}

.verdict{
  margin-top:22px;padding:20px 22px;border-radius:var(--radius);
  border:2px solid var(--line);background:rgba(201,167,78,.12);font-size:.98rem;
}
.verdict p{margin:0 0 12px}
.verdict p:last-child{margin-bottom:0}

/* ============================================================ Reading == */

.reading-grid{display:grid;gap:22px}
.entry{
  display:grid;gap:0;border:4px double var(--gold);border-radius:var(--radius);
  overflow:hidden;background:var(--parchment-3);
  box-shadow:2px 2px 0 rgba(61,43,31,.16);
}
@media (min-width:700px){
  .entry{grid-template-columns:210px 1fr;align-items:stretch}
}
.entry__card{padding:20px;display:flex;justify-content:center;background:var(--parchment-2);border-right:1px solid var(--line)}
.entry__card .card{width:100%;max-width:170px}
.entry__body{padding:20px 22px}
.entry__pos{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-deep)}
.entry__name{margin:2px 0 4px;font-size:1.24rem;font-weight:700;letter-spacing:.04em;color:var(--red)}
.entry__latin{color:var(--ink-faint);font-size:.8rem;letter-spacing:.08em}
.badge{
  display:inline-block;margin-left:10px;padding:2px 10px;border-radius:99px;
  font-size:.62rem;letter-spacing:.16em;vertical-align:middle;
  border:2px solid var(--gold);color:var(--gold-deep);
}
.badge--reversed{color:var(--red);border-color:var(--red)}
.entry__keywords{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 14px}
.entry__keywords span{
  font-size:.74rem;padding:3px 11px;border-radius:99px;
  border:1px solid var(--line);color:var(--brown-soft);background:var(--parchment-2);
}
.entry__text{margin:0 0 12px;font-size:.96rem}
.entry__meta{
  margin-top:14px;padding-top:12px;border-top:1px solid var(--line);
  font-size:.82rem;color:var(--ink-faint);display:grid;gap:6px;
}
.entry__meta b{color:var(--brown-soft);font-weight:700}
.entry__hint{font-size:.82rem;color:var(--ink-faint);font-style:italic;margin:0 0 12px}
.anim-in{animation:fadein .5s var(--ease) both;animation-delay:var(--d,0ms)}

/* =============================================================== Codex == */

.codex-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(126px,1fr))}
.codex-item{
  position:relative;display:flex;flex-direction:column;gap:8px;
  padding:0;border:0;background:none;cursor:pointer;text-align:left;
  font-family:inherit;color:inherit;
}
.codex-item .card{transition:box-shadow var(--dur) var(--ease),border-color var(--dur) var(--ease)}
.codex-item:hover .card{box-shadow:5px 5px 0 rgba(61,43,31,.25);border-color:var(--gold-hi)}
.codex-item__name{font-size:.82rem;letter-spacing:.04em;text-align:center;color:var(--brown-soft)}
.codex-item[hidden]{display:none}

/* ============================================================== Modal == */

.modal[hidden]{display:none}
.modal{
  position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:20px;
  background:rgba(61,43,31,.55);animation:fadein .3s var(--ease) both;
}
.modal__box{
  position:relative;width:min(760px,100%);max-height:86vh;overflow:auto;
  border:4px double var(--gold);border-radius:var(--radius);
  background:var(--parchment-3);box-shadow:5px 5px 0 rgba(61,43,31,.3);padding:28px;
  animation:fadein .4s var(--ease) both;
}
.modal__close{
  position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:var(--radius);
  border:2px solid var(--gold);background:var(--parchment-2);color:var(--red);
  cursor:pointer;font-size:1rem;line-height:1;display:grid;place-items:center;
  transition:border-color var(--dur) var(--ease),color var(--dur) var(--ease);
}
.modal__close:hover{border-color:var(--gold-hi);color:var(--gold-deep)}
.modal__head{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:18px}
.modal__card{width:120px;flex:0 0 auto}
.modal__head-body{flex:1 1 240px;min-width:0}
.modal__title{margin:0;font-size:1.4rem;font-weight:700;letter-spacing:.06em;color:var(--red)}

.cols{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.col{border:2px solid var(--line);border-radius:var(--radius);padding:16px 18px;background:var(--parchment-2)}
.col__label{font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:6px}
.col h4{margin:0 0 8px;font-size:.98rem;letter-spacing:.04em;color:var(--red)}
.col p{margin:0;font-size:.92rem;color:var(--brown-soft)}

/* ============================================================ History == */

.history-list{display:grid;gap:12px;list-style:none;margin:0;padding:0}
.history-item{
  display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;
  padding:18px 20px;border:4px double var(--gold);border-radius:var(--radius);
  background:var(--parchment-3);box-shadow:2px 2px 0 rgba(61,43,31,.16);
}
.history-item__main{flex:1 1 260px;min-width:0}
.history-item__time{font-size:.7rem;letter-spacing:.14em;color:var(--ink-faint)}
.history-item__spread{margin:4px 0 2px;font-size:1.04rem;font-weight:700;letter-spacing:.04em;color:var(--red)}
.history-item__q{margin:0;color:var(--brown-soft);font-size:.88rem;word-break:break-word}
.history-item__cards{margin-top:8px;font-size:.78rem;color:var(--ink-faint);line-height:1.7}
.history-item__cards b{color:var(--brown-soft);font-weight:700}
.history-item__actions{display:flex;gap:8px;flex-wrap:wrap}

/* ============================================================== Notes == */

.note{
  font-size:.84rem;color:var(--ink-faint);line-height:1.8;
  padding:14px 18px;border-radius:var(--radius);
  border:2px solid var(--line);background:rgba(201,167,78,.1);
}
.disclaimer{border-color:var(--red);background:rgba(139,26,26,.08);color:var(--brown-soft)}
.disclaimer strong{color:var(--red)}

.empty{
  text-align:center;padding:52px 24px;color:var(--ink-faint);
  border:2px dashed var(--line);border-radius:var(--radius);
}
.empty__mark{font-size:1.8rem;color:var(--gold);margin-bottom:10px}

/* =============================================================== Foot == */

.vault-foot{
  margin-top:72px;padding:28px 0 0;border-top:4px double var(--gold);
  text-align:center;font-size:.78rem;color:var(--ink-faint);
}
.vault-foot p{margin:0 0 8px}
.vault-foot a{color:var(--red)}
.vault-foot a:hover{color:var(--gold-deep)}

/* ============================================================== Toast == */

.toast{
  position:fixed;left:50%;bottom:30px;translate:-50% 0;z-index:90;
  padding:11px 22px;border-radius:var(--radius);font-size:.8rem;letter-spacing:.06em;
  border:2px solid var(--gold);background:var(--parchment-2);color:var(--red);
  box-shadow:3px 3px 0 rgba(61,43,31,.25);
  animation:fadein .3s var(--ease) both;
}
.toast[hidden]{display:none}

/* ========================================================= Animation == */

@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes shuffle{0%,100%{opacity:1}50%{opacity:.5}}

@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:.01ms!important;
  }
}

@media print{
  .vault-head,.vault-foot,.btn-row,.toast{display:none!important}
  body{background:#f7f0e1;color:#2c2418}
  .panel,.entry,.history-item,.card,.spread-card{border-color:#9b8a63;box-shadow:none;background:#f7f0e1}
}
`;
}
