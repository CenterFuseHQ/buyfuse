import { PRODUCTS, resolveProductUrls, type ProductUrls } from "@centerfuse/config";
import { renderDocument, renderFamilyFooter, renderFamilyHeader, renderState } from "@centerfuse/ui";
import { buyerClientScript } from "./buyer-client.js";
import { buyerStyles } from "./buyer-styles.js";

export function renderBuyFuseDashboard(urls: ProductUrls = resolveProductUrls({})): string {
  const body = `<div class="bf-app"><style>${buyerStyles}</style>${renderFamilyHeader("BUYFUSE", urls)}<main id="main" class="shell">
  <div class="bf-switch"><input id="bf-dark" type="checkbox" aria-label="Enable dark mode"><label for="bf-dark">Dark mode</label></div>
  <div class="bf-splash"><section class="hero" aria-labelledby="bf-title">
  <p class="eyebrow">BuyFuse · Your personal buyer studio</p><h1 id="bf-title" class="display">A better place for everything you're considering.</h1>
  <p class="lede">Keep item names, source links, notes and purchase decisions in one focused workspace. No seller inventory or marketplace claims—just the context you want to remember.</p>
  <div class="row"><a class="button" href="#auth">Open your workspace</a><a class="button secondary" href="#bf-demo">Try a sample</a></div></section>
  <div class="bf-collage" role="img" aria-label="Illustration of a sample BuyFuse workspace with a saved-item card, private notes and purchase status.">
    <div class="bf-ghost"><span class="bf-status-chip">Saved item</span><strong>Things worth remembering</strong><p>Keep source links and notes together.</p></div>
    <div class="bf-ghost"><span class="bf-status-chip">Considering</span><strong>Decide when you're ready</strong><p>Update status: considering, purchased or archived.</p></div>
  </div></div>
  <section class="bf-feature-strip" aria-label="Buyer workspace benefits">
    <article><strong>01 · Save</strong><p>Keep an item's name and source in one place.</p></article>
    <article><strong>02 · Remember</strong><p>Write down the details that matter to you.</p></article>
    <article><strong>03 · Decide</strong><p>Track your own purchase status.</p></article>
  </section>
  <section class="bf-demo" id="bf-demo" aria-labelledby="bf-demo-title">
    <p class="eyebrow">Interactive sample · No account needed</p><h2 id="bf-demo-title">Try the buyer journey</h2>
    <p class="bf-privacy">This isolated preview runs in your browser. It does not save data or send anything to BuyFuse, and it is not a comparison-shopping or pricing service.</p>
    <div class="bf-demo-grid"><div class="card">
      <form id="buyer-demo-form" class="stack">
        <label class="field" for="demo-title">Sample item<input id="demo-title" maxlength="100" required value="Desk lamp"></label>
        <label class="field" for="demo-note">Your note<textarea id="demo-note" maxlength="500">Check dimensions before deciding.</textarea></label>
        <label class="field" for="demo-status">Purchase status<select id="demo-status"><option value="CONSIDERING">Considering</option><option value="PURCHASED">Purchased</option><option value="ARCHIVED">Archived</option></select></label>
        <button type="submit">Preview item</button>
      </form>
    </div><div class="card"><span class="bf-status-chip">Simulation · Not saved</span><h3>Your sample workspace card</h3>
      <output id="buyer-demo-result" aria-live="polite" aria-label="Sample item preview">Item: Desk lamp
Status: Considering
Notes: Check dimensions before deciding.</output>
      <p class="bf-privacy">Sign in for an account workspace, or continue without an account in this browser.</p>
    </div></div>
  </section>
  <section id="auth" class="card"><p class="eyebrow">Private buyer workspace</p><h2>Open your workspace</h2><p>Use your CenterFuse identity foundation for an account workspace, or keep entries in this browser without creating an account.</p><div class="grid"><label class="field">Email<input id="email" type="email" autocomplete="email"></label><label class="field">Password<input id="password" type="password" minlength="12" autocomplete="current-password"></label></div><div class="row"><button id="login">Sign in</button><button class="button secondary" id="register">Create account</button><button class="button secondary" id="local-workspace" type="button">Use this browser only</button></div><p class="bf-privacy">Local entries are not encrypted and are visible to anyone using this browser profile. Clearing this site's storage removes them. Download regular backups.</p></section>
  <section id="workspace" class="stack" hidden aria-label="Your saved items workspace"><div class="grid"><article class="card"><p class="eyebrow">Saved</p><strong id="saved-count" class="display" style="font-size:3rem">0</strong><p>items in your workspace</p></article><article class="card"><p class="eyebrow">A quieter decision space</p><h2>Keep context close.</h2><p>Add what matters to you without rebuilding a seller listing.</p></article></div>
  <section class="card"><div class="row"><h2>Your buyer workspace</h2><button class="button secondary" id="switch-workspace" type="button">Use local workspace</button></div><p class="bf-privacy" id="workspace-mode">Account and local workspaces stay separate. Local entries never upload automatically.</p><div class="row"><button class="button secondary" id="export-backup" type="button">Download backup</button><button class="button secondary" id="import-backup" type="button">Restore backup</button><input id="backup-file" type="file" accept="application/json,.json" hidden aria-label="Choose a BuyFuse backup"></div><p class="bf-privacy">Backups contain item names, source links, notes and status. Store them somewhere private.</p></section>
  <section class="card"><h2>Save an item</h2><form id="save-form" class="stack"><label class="field">Item name<input id="title" required minlength="2" maxlength="200"></label><label class="field">Source link (optional)<input id="source-url" type="url" placeholder="https://"></label><label class="field">Notes (optional)<textarea id="notes" maxlength="2000" placeholder="Size, color, delivery details, questions…"></textarea></label><button>Save to BuyFuse</button></form></section>
  <section class="card"><h2>Your items</h2><div id="items">${renderState("empty", "Nothing saved yet", "Add an item above and it will appear here.")}</div></section></section>
  <p id="status" class="toast" role="status" aria-live="polite" hidden></p></main>${renderFamilyFooter(urls)}</div>`;
  const scripts = buyerClientScript;
  return renderDocument({ product: PRODUCTS.BUYFUSE, title: "BuyFuse — Your buyer workspace", description: "Keep items you are considering, source links, and notes organized in BuyFuse.", body, scripts });
}

export function renderBuyFuseState(kind: "loading" | "error" | "not-found", urls: ProductUrls = resolveProductUrls({})): string { const state = kind === "loading" ? renderState("loading", "Loading BuyFuse", "Opening your workspace…") : kind === "error" ? renderState("error", "Workspace unavailable", "BuyFuse could not complete that request.") : renderState("empty", "Page not found", "That BuyFuse page does not exist."); return renderDocument({ product: PRODUCTS.BUYFUSE, title: "BuyFuse", description: "BuyFuse status", body: `${renderFamilyHeader("BUYFUSE", urls)}<main id="main" class="shell hero">${state}</main>${renderFamilyFooter(urls)}` }); }
