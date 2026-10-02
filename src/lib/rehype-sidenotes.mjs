// Turns `[^id]` markers in post bodies into a numbered reference and a
// floated sidenote, using the `notes` array from the post's frontmatter.
//
//   <sup id="ref-n1" class="note-ref" data-note="n1"><a href="#note-n1">1</a></sup>
//   <aside id="note-n1" class="sidenote" data-note="n1">…</aside>
//
// <aside> may not sit inside <p>, so a paragraph holding a note is emitted as
// <div class="p"> (styled the same as <p>).
//
// The notes are also listed after the body (<section class="notes-list">),
// which is what phones show instead of the floated sidenotes:
//
//   <div id="notes-n1" class="notes-item" data-note="n1">…</div>

const MARK = /\[\^([\w-]+)\]/g;

export const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
export const text = (value) => ({ type: 'text', value });

/**
 * The three pieces of note `num` (id `id`): the number in the text, the
 * floated sidenote, and its entry in the list after the body.
 * note = { title?, cite?, body }
 */
export function buildNote(id, num, note) {
  const ref = el('sup', { id: `ref-${id}`, className: ['note-ref'], dataNote: id }, [
    el('a', { href: `#note-${id}`, ariaLabel: `注${num}` }, [text(String(num))]),
  ]);
  const content = () => [
    el('span', { className: ['sidenote-head'] }, [
      el('a', { href: `#ref-${id}`, className: ['note-num'], ariaLabel: `本文の注${num}へ戻る` }, [text(String(num))]),
      ...(note.title ? [text(note.title)] : []),
    ]),
    ...(note.cite ? [el('span', { className: ['sidenote-cite'] }, [text(note.cite)])] : []),
    el('span', { className: ['sidenote-body'] }, linkify(note.body)),
  ];
  const aside = el('aside', { id: `note-${id}`, className: ['sidenote'], dataNote: id }, content());
  const item = el('div', { id: `notes-${id}`, className: ['notes-item'], dataNote: id }, content());
  return { ref, aside, item };
}

/** Note text with its URLs as links. */
function linkify(value) {
  const out = [];
  let last = 0;
  for (const m of String(value).matchAll(/https?:\/\/[^\s<>"'）)」』]+/g)) {
    if (m.index > last) out.push(text(value.slice(last, m.index)));
    out.push(el('a', { href: m[0], target: '_blank', rel: 'noopener' }, [text(m[0])]));
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push(text(value.slice(last)));
  return out;
}

/** The notes gathered after the body (what phones show). */
export const notesList = (items) => el('section', { className: ['notes-list'], ariaLabel: '注' }, items);

export default function rehypeSidenotes() {
  return (tree, file) => {
    const notes = file.data?.astro?.frontmatter?.notes ?? [];
    const byId = new Map(notes.map((n) => [n.id, n]));
    let count = 0;
    const listed = [];

    const build = (id) => {
      const note = byId.get(id);
      if (!note) throw new Error(`[sidenotes] note "${id}" is not defined in frontmatter (${file.path})`);
      const { ref, aside, item } = buildNote(id, ++count, note);
      listed.push(item);
      return [ref, aside];
    };

    const walk = (node) => {
      if (!node.children) return false;
      let found = false;
      node.children = node.children.flatMap((child) => {
        if (child.type === 'text' && MARK.test(child.value)) {
          MARK.lastIndex = 0;
          found = true;
          const out = [];
          let last = 0;
          for (const m of child.value.matchAll(MARK)) {
            if (m.index > last) out.push(text(child.value.slice(last, m.index)));
            out.push(...build(m[1]));
            last = m.index + m[0].length;
          }
          if (last < child.value.length) out.push(text(child.value.slice(last)));
          return out;
        }
        if (walk(child)) found = true;
        return [child];
      });
      if (found && node.type === 'element' && node.tagName === 'p') {
        node.tagName = 'div';
        node.properties = { ...node.properties, className: ['p'] };
      }
      return found;
    };
    walk(tree);
    if (listed.length) {
      tree.children.push(notesList(listed));
    }
  };
}
