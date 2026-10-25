/** BuyFuse-only visual layer; never imported by the parent platform or SellFuse. */
export const buyerStyles = String.raw\`
.bf-app{--bf-ink:#21183c;--bf-muted:#625b79;--bf-paper:#faf9ff;--bf-panel:#fff;--bf-line:#e8e1f5;--bf-accent:#6546dc;--bf-soft:#f0ecff;display:block;min-height:100vh;background:radial-gradient(circle at 83% 5%,#ede9ff,transparent 42%),var(--bf-paper);color:var(--bf-ink);color-scheme:light}
.bf-app:has(#bf-dark:checked){--bf-ink:#f8f5ff;--bf-muted:#d0c7e8;--bf-paper:#151126;--bf-panel:#261f3b;--bf-line:#51426d;--bf-accent:#c1b0ff;--bf-soft:#362953;background:radial-gradient(circle at 83% 5%,#39294e,transparent 42%),var(--bf-paper);color-scheme:dark}
.bf-app .family-nav{max-width:74rem}.bf-app .brand,.bf-app .nav-links a{color:var(--bf-ink)}
.bf-app .nav-links a[aria-current=page]{background:var(--bf-panel)}
.bf-app .shell{width:min(74rem,calc(100% - 2rem))}
.bf-app .hero{padding:clamp(2rem,6vw,5rem) 0 2rem}
.bf-app .display{font-size:clamp(2.8rem,6vw,5.7rem);max-width:13ch;line-height:1;letter-spacing:-.06em}
.bf-app .lede,.bf-app .card p{color:var(--bf-muted)}
.bf-app .card{background:var(--bf-panel);border-color:var(--bf-line);box-shadow:0 12px 32px #2713460e}
.bf-app .eyebrow{color:var(--bf-accent)}
.bf-app button,.bf-app .button{background:#6546dc;color:#fff;border-radius:12px}
.bf-app button.secondary,.bf-app .button.secondary{background:var(--bf-soft);color:var(--bf-ink)}
.bf-app .field input,.bf-app .field textarea,.bf-app .field select{background:var(--bf-panel);color:var(--bf-ink);border-color:var(--bf-line)}
.bf-app :is(a,button,input,textarea,select,summary):focus-visible{outline:3px solid #de8534;outline-offset:3px}
.bf-app .family-footer{border-color:var(--bf-line)}
.bf-switch{display:flex;gap:.45rem;align-items:center;justify-content:flex-end;font-size:.89rem;color:var(--bf-muted);font-weight:700}
.bf-switch input{width:1.1rem;height:1.1rem;accent-color:#754adb}
.bf-splash{display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:2rem}
.bf-splash .hero{margin:0}
.bf-collage{padding:1.7rem;border:1px solid var(--bf-line);border-radius:2rem;display:grid;gap:1rem;background:linear-gradient(140deg,var(--bf-panel),var(--bf-soft));transform:rotate(1deg);box-shadow:0 25px 65px #39206414}
.bf-ghost{border-radius:1rem;background:var(--bf-panel);padding:1.2rem;box-shadow:0 6px 22px #160b3c10}
.bf-ghost p{margin:.35rem 0;color:var(--bf-muted)}
.bf-ghost strong{display:block;font-size:1.1rem}
.bf-status-chip{display:inline-flex;align-items:center;border-radius:999px;background:var(--bf-soft);padding:.35rem .75rem;color:var(--bf-accent);font-size:.8rem;font-weight:850}
.bf-feature-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.3rem 0 3rem}
.bf-feature-strip article{background:var(--bf-panel);border:1px solid var(--bf-line);border-radius:1.1rem;padding:1.25rem}
.bf-feature-strip strong{display:block;margin:.35rem 0}
.bf-feature-strip p{color:var(--bf-muted);line-height:1.5;margin:0}
.bf-demo{border:1px solid var(--bf-line);background:var(--bf-soft);border-radius:1.7rem;padding:clamp(1rem,3vw,2rem);margin-bottom:2rem}
.bf-demo h2{margin-top:.1rem;font-size:clamp(1.6rem,3vw,2.5rem)}
.bf-demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem}
.bf-demo-grid .card{margin:0}
.bf-demo label{font-size:.9rem}
.bf-demo output{display:block;border:1px solid var(--bf-line);background:var(--bf-panel);border-radius:1rem;min-height:10rem;padding:1rem;white-space:pre-wrap;line-height:1.8;overflow-wrap:anywhere}
.bf-privacy{color:var(--bf-muted);font-size:.85rem;line-height:1.5}
.bf-auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.3rem}
.bf-workspace-grid{display:grid;grid-template-columns:1fr 2fr;gap:1.2rem;align-items:start}
.bf-app #workspace .state{background:var(--bf-soft);border-color:var(--bf-line);text-align:left}
.bf-app #workspace .state h3{margin-top:0}
.bf-app .toast{background:#392173;color:#fff}
.bf-app .family-nav .nav-links{flex-wrap:nowrap;overflow-x:auto}
.bf-app .family-nav .nav-links a:not([aria-current=page]){display:inline-flex}
@media(max-width:45rem){.bf-splash,.bf-feature-strip,.bf-demo-grid,.bf-auth-grid,.bf-workspace-grid{grid-template-columns:1fr}.bf-collage{transform:none}.bf-app .family-nav{display:grid;justify-content:stretch;gap:.7rem}.bf-app .nav-links{justify-content:flex-start}.bf-app .display{font-size:clamp(2.6rem,12vw,4.3rem)}}
@media(prefers-reduced-motion:reduce){.bf-app *{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
\`;
