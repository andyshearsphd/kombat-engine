// "Play it like an app": a one-time card that shows phone visitors how to put the game on their home screen.
// iPhone and iPad: Safari can't be asked to install a site, so the card walks through the steps for the visitor's Safari version.
// Android Chrome: the browser offers a real install prompt, so the card gets an INSTALL button.
// Configure with data attributes on the script tag: data-name, data-icon, data-accent, data-key.
'use strict';
(() => {
  const me = document.currentScript, cfg = me ? me.dataset : {};
  const NAME = cfg.name || document.title, ICON = cfg.icon || 'icons/icon-180.png', ACC = cfg.accent || '#d8261c', KEY = (cfg.key || 'game') + '-install';
  const ua = navigator.userAgent;
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  if (standalone || /[?&]auto/.test(location.search)) return;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|TikTok|musical_ly|LinkedInApp|Twitter|GSA\//.test(ua);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const sv = +((ua.match(/Version\/(\d+)/) || [])[1] || 0);
  // seen a few times and waved off: stop asking
  let seen = 0;
  try { seen = +(localStorage.getItem(KEY) || 0); } catch (e) { /* private mode */ }
  if (seen >= 3) return;

  let androidPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); androidPrompt = e; if (!ios && !shown) show(); });
  let shown = false;

  const dots = '<span class="ia-k">&bull;&bull;&bull;</span>';
  const share = '<svg class="ia-i" viewBox="0 0 20 24"><path d="M10 2v13M5 7l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10H3v12h14V10h-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  const plus = '<svg class="ia-i" viewBox="0 0 22 22"><rect x="1.5" y="1.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 6v10M6 11h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  function steps() {
    if (inApp) return ['You are inside another app\'s browser, which can\'t save games to your home screen.',
      `Tap ${dots} or the compass, choose <b>Open in Safari</b>, then come back to this card.`];
    if (otherBrowser) return [`Tap the Share button ${share} in the address bar.`, `Tap <b>Add to Home Screen</b> ${plus}.`, 'Tap <b>Add</b>.'];
    if (sv >= 26) return [`Tap ${dots} next to the address bar at the bottom of Safari (or the Share button ${share} if you see it).`,
      `Tap <b>Share</b> ${share}.`, `Scroll down and tap <b>Add to Home Screen</b> ${plus}.`, 'Leave <b>Open as Web App</b> on and tap <b>Add</b>.'];
    return [`Tap the Share button ${share} at the bottom of Safari.`, `Scroll down and tap <b>Add to Home Screen</b> ${plus}.`, 'Tap <b>Add</b>.'];
  }

  function show() {
    if (shown) return; shown = true;
    const css = document.createElement('style');
    css.textContent = `
      #ia { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 14px;
        padding: max(14px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
        box-sizing: border-box; background: radial-gradient(circle at 50% 40%, #3c080a, #000); color: #fff;
        font: 15px/1.35 -apple-system, system-ui, sans-serif; touch-action: manipulation; -webkit-user-select: none; user-select: none; }
      #ia .ia-card { width: 100%; max-width: 420px; max-height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; text-align: center; }
      #ia .ia-top { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 6px; }
      #ia img { width: 58px; height: 58px; border-radius: 13px; box-shadow: 0 0 0 2px ${ACC}, 0 4px 18px rgba(0,0,0,0.6); }
      #ia h1 { font: 400 28px/1.05 Anton, Impact, sans-serif; margin: 0; letter-spacing: 0.5px; text-align: left; }
      #ia h1 small { display: block; font-size: 15px; color: ${ACC}; letter-spacing: 1px; }
      #ia p.ia-why { margin: 6px 0 12px; color: #d8d2c8; font-size: 14px; }
      #ia ol { list-style: none; counter-reset: s; margin: 0 0 14px; padding: 0; text-align: left; }
      #ia li { counter-increment: s; position: relative; padding: 8px 10px 8px 42px; margin: 6px 0; background: rgba(255,255,255,0.07); border-radius: 10px; }
      #ia li::before { content: counter(s); position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border-radius: 50%;
        background: ${ACC}; color: #fff; font: 400 15px/24px Anton, Impact, sans-serif; text-align: center; }
      #ia .ia-i { width: 1.1em; height: 1.1em; vertical-align: -0.2em; color: #4aa3ff; }
      #ia .ia-k { color: #4aa3ff; font-weight: 900; letter-spacing: -1px; }
      #ia button { font: 400 18px Anton, Impact, sans-serif; letter-spacing: 1px; border: 0; border-radius: 10px; padding: 11px 18px; margin: 4px; color: #fff; }
      #ia .ia-go { background: ${ACC}; }
      #ia .ia-skip { background: rgba(255,255,255,0.12); color: #d8d2c8; font-size: 15px; }
      #ia .ia-arrow { position: fixed; left: 50%; bottom: max(6px, env(safe-area-inset-bottom)); transform: translateX(-50%); color: ${ACC};
        font: 400 13px Anton, Impact, sans-serif; letter-spacing: 1px; text-align: center; animation: iaBob 1s ease-in-out infinite; pointer-events: none; }
      #ia .ia-arrow svg { display: block; margin: 2px auto 0; width: 26px; height: 26px; }
      @keyframes iaBob { 50% { transform: translate(-50%, 7px); } }
      @media (orientation: landscape) { #ia .ia-arrow { display: none; } #ia .ia-card { max-width: 640px; } #ia ol { columns: 2; column-gap: 8px; } #ia li { break-inside: avoid; margin-top: 0; } }
    `;
    document.head.appendChild(css);
    const el = document.createElement('div');
    el.id = 'ia';
    const android = !ios && androidPrompt;
    el.innerHTML = `<div class="ia-card">
        <div class="ia-top"><img src="${ICON}" alt=""><h1>${NAME}<small>PLAY IT LIKE AN APP</small></h1></div>
        <p class="ia-why">Full screen, no browser bars, one tap to play. It takes about ten seconds.</p>
        ${android ? '' : '<ol>' + steps().map(s => `<li>${s}</li>`).join('') + (inApp ? '' : `<li>Open <b>${NAME}</b> from your home screen.</li>`) + '</ol>'}
        ${android ? '<button class="ia-go">INSTALL</button>' : ''}
        <button class="ia-skip">PLAY IN THE BROWSER</button>
      </div>
      ${ios && !inApp && !otherBrowser ? '<div class="ia-arrow">SAFARI\'S BUTTONS ARE DOWN HERE<svg viewBox="0 0 24 24"><path d="M12 3v16M5 13l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' : ''}`;
    // keep the game's own touch handlers from swallowing taps meant for the card
    for (const ev of ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'click']) el.addEventListener(ev, e => e.stopPropagation());
    document.body.appendChild(el);
    const close = () => { try { localStorage.setItem(KEY, String(seen + 1)); } catch (e) { /* private mode */ } el.remove(); };
    el.querySelector('.ia-skip').addEventListener('click', close);
    const go = el.querySelector('.ia-go');
    if (go) go.addEventListener('click', async () => { androidPrompt.prompt(); try { await androidPrompt.userChoice; } catch (e) { /* ignored */ } el.remove(); });
  }

  if (ios) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  }
})();
