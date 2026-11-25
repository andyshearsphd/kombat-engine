// Kombat Engine: arcade text (Metal Mania headlines, Anton small text, italic, gradient fill, heavy outline)
'use strict';
const TXT = (() => {
  const FAMILY = 'Anton, Impact, "Arial Narrow", sans-serif';
  const GRADS = {
    gold: ['#fff7c2', '#ffd23c', '#e07b10'],
    fire: ['#fff1a0', '#ff9a2a', '#d8260e'],
    ice: ['#ffffff', '#9fe2ff', '#2f7fe0'],
    white: ['#ffffff', '#f0f0f6', '#b8b8c8'],
    red: ['#ffd0c8', '#ff5a4a', '#a8140e'],
    green: ['#e6ffd8', '#6cff6a', '#1c9a2a'],
    purple: ['#f0e0ff', '#b98cff', '#5b2d8e'],
    blood: ['#ff8a7a', '#d0101a', '#5a0006'],
    steel: ['#ffffff', '#c8ccd8', '#5a6070'],
  };
  const BLOOD = 'Nosifer, Anton, Impact, sans-serif';
  const HEAD = '"Metal Mania", Anton, Impact, sans-serif'; // big headlines; small text stays Anton
  const BIG = 13;
  function font(size, fam) { return `${size}px ${fam || (size >= BIG ? HEAD : FAMILY)}`; }
  function width(ctx, str, size, fam) { ctx.save(); ctx.font = font(size, fam); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  // opt: size, align, fill (css color or a GRADS key), stroke, italic, shadow
  function draw(ctx, str, x, y, opt = {}) {
    str = String(str);
    const size = opt.size || 12;
    ctx.save();
    const fam = opt.blood ? BLOOD : opt.plain ? FAMILY : null;
    ctx.font = font(size, fam);
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    const w = ctx.measureText(str).width;
    if (window.MK_BOXES) { const mt = ctx.measureText(str), sh = opt.shadow !== false ? size * 0.08 + 1 : 0, m = ctx.getTransform(), ax = opt.align === 'center' ? x - w / 2 : opt.align === 'right' ? x - w : x; window.MK_BOXES.push({ k: 'txt', s: str, x0: m.a * ax + m.e, y0: m.d * (y - mt.actualBoundingBoxAscent) + m.f, x1: m.a * (ax + w + sh) + m.e, y1: m.d * (y + mt.actualBoundingBoxDescent + sh) + m.f }); }
    let dx = x;
    if (opt.align === 'center') dx = x - w / 2; else if (opt.align === 'right') dx = x - w;
    ctx.translate(Math.round(dx), Math.round(y));
    if (opt.italic !== false && !opt.blood) ctx.transform(1, 0, -0.16, 1, size * 0.16, 0);
    const sw = opt.strokeW != null ? opt.strokeW : Math.max(1.5, size * 0.16);
    if (opt.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = sw; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(str, size * 0.08 + 1, size * 0.08 + 1); ctx.fillText(str, size * 0.08 + 1, size * 0.08 + 1);
    }
    if (opt.stroke !== null) { ctx.lineWidth = sw; ctx.strokeStyle = opt.stroke || '#12081c'; ctx.strokeText(str, 0, 0); }
    const f = opt.fill || 'white';
    if (GRADS[f]) {
      const g = ctx.createLinearGradient(0, size * 0.12, 0, size * 1.12);
      const c = GRADS[f]; g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = f;
    ctx.fillText(str, 0, 0);
    ctx.restore();
    return w;
  }
  const ready = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('20px Anton'), document.fonts.load('20px Nosifer'), document.fonts.load('20px "Metal Mania"')]).catch(() => {}) : Promise.resolve();
  return { draw, width, font, ready, GRADS, BLOOD };
})();
