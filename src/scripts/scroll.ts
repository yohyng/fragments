// Scroll chrome for every [data-scroll] column (see componentDidMount in
// design_handoff_fragments/fragments v2.dc.html):
// - a 1px thumb (neutral-500) shown only while scrolling: fades in over 0.2s,
//   fades out over 0.6s once scrolling has stopped for 700ms. It travels from
//   10px below the column's header rule to 10px above the column's bottom.
// - [data-atend] on the column while it is scrolled to the bottom, which fades
//   in its bottom rule ([data-endrule] inside it, or one drawn here if absent).

type Column = HTMLElement & { _h?: ReturnType<typeof setTimeout> };

const thumbs = new Map<HTMLElement, HTMLElement>();
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
  const ratio = sc.clientHeight / sc.scrollHeight;
  th.style.display = ratio >= 1 ? 'none' : 'block';
  const head = sc.firstElementChild as HTMLElement | null;
  const off = head ? head.offsetHeight + 10 : 0;
  const track = sc.clientHeight - off - 10;
  const h = Math.max(24, track * ratio);
  th.style.height = h + 'px';
  th.style.left = sc.offsetLeft + sc.offsetWidth - 1 + 'px';
  th.style.top =
    sc.offsetTop + off + (track - h) * (sc.scrollTop / Math.max(1, sc.scrollHeight - sc.clientHeight)) + 'px';
  return th;
}

document.addEventListener(
  'scroll',
  (e) => {
    const t = e.target as Column;
    if (!t || !t.hasAttribute || !t.hasAttribute('data-scroll')) return;
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
      er.style.left = t.offsetLeft + 'px';
      er.style.width = t.clientWidth + 'px';
      er.style.top = t.offsetTop + t.clientHeight + 'px';
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
