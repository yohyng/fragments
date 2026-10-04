// Scroll chrome for every [data-scroll] column (see componentDidMount in
// design_handoff_fragments/fragments v2.dc.html):
// - a 1px thumb (neutral-500) shown only while scrolling: fades in over 0.2s,
//   fades out over 0.6s once scrolling has stopped for 700ms. It travels from
//   10px below the column's header rule to 10px above the column's bottom,
//   at the right end of the column's rules.
// - [data-atend] on the column while it is scrolled to the bottom, which fades
//   in its bottom rule ([data-endrule] inside it, or one drawn here if absent).

type Column = HTMLElement & { _h?: ReturnType<typeof setTimeout> };

const thumbs = new Map<HTMLElement, HTMLElement>();

// Margins drawn inside a full-screen column (--inset-* in base.css).
function insets(sc: HTMLElement) {
  const cs = getComputedStyle(sc);
  return {
    left: parseFloat(cs.paddingLeft) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    top: parseFloat(cs.getPropertyValue('--inset-top')) || 0,
    bottom: parseFloat(cs.getPropertyValue('--inset-bottom')) || 0,
  };
}
const ends = new Map<HTMLElement, HTMLElement>();

function place(sc: HTMLElement): HTMLElement {
  let th = thumbs.get(sc);
  const host = sc.parentElement!;
  if (!th) {
    th = document.createElement('div');
    th.style.cssText =
      'position:absolute;width:1px;background:var(--color-neutral-500);opacity:0;transition:opacity .45s ease;pointer-events:none;z-index:2';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(th);
    thumbs.set(sc, th);
  }
  const ins = insets(sc);
  // what is visible of what there is, both without the inner margins
  const ratio = (sc.clientHeight - ins.top - ins.bottom) / (sc.scrollHeight - ins.top - ins.bottom);
  th.style.display = ratio >= 1 ? 'none' : 'block';
  const head = sc.firstElementChild as HTMLElement | null;
  const off = head ? head.offsetHeight + 10 : 0;
  const track = sc.clientHeight - off - 10 - ins.bottom;
  const h = Math.max(24, track * ratio);
  th.style.height = h + 'px';
  // at the right end of the column's rules (an article's stop at its notes
  // or its body), else at the column's right edge
  const rule = sc.querySelector<HTMLElement>('[data-endrule]');
  const right = rule
    ? rule.getBoundingClientRect().right - sc.getBoundingClientRect().left
    : sc.offsetWidth - ins.right;
  th.style.left = sc.offsetLeft + right - 1 + 'px';
  th.style.top =
    sc.offsetTop + off + (track - h) * (sc.scrollTop / Math.max(1, sc.scrollHeight - sc.clientHeight)) + 'px';
  return th;
}

document.addEventListener(
  'scroll',
  (e) => {
    const t = e.target as Column;
    if (!t || !t.hasAttribute || !t.hasAttribute('data-scroll')) return;
    if (t.hasAttribute('data-restoring')) return;
    if (t.scrollTop + t.clientHeight >= t.scrollHeight - 2) t.setAttribute('data-atend', '');
    else t.removeAttribute('data-atend');
    const th = place(t);
    th.style.transition = 'opacity .2s ease';
    th.style.opacity = '1';
    if (!t.querySelector('[data-endrule]')) {
      let er = ends.get(t);
      if (!er) {
        er = document.createElement('div');
        er.style.cssText =
          'position:absolute;height:0;border-top:1px solid var(--color-neutral-700);opacity:0;transition:opacity .5s ease;pointer-events:none;z-index:2';
        t.parentElement!.appendChild(er);
        ends.set(t, er);
      }
      const ins = insets(t);
      er.style.left = t.offsetLeft + ins.left + 'px';
      er.style.width = t.clientWidth - ins.left - ins.right + 'px';
      er.style.top = t.offsetTop + t.clientHeight - ins.bottom + 'px';
      er.style.opacity = t.hasAttribute('data-atend') ? '1' : '0';
    }
    clearTimeout(t._h);
    t._h = setTimeout(() => {
      th.style.transition = 'opacity .6s ease';
      th.style.opacity = '0';
    }, 700);
  },
  true,
);
