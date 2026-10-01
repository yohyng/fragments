// Turns `[^id]` markers in post bodies into a numbered reference and a
// floated sidenote, using the `notes` array from the post's frontmatter.
//
//   <sup id="ref-n1" class="note-ref" data-note="n1"><a href="#note-n1">1</a></sup>
//   <aside id="note-n1" class="sidenote" data-note="n1">…</aside>
//
// <aside> may not sit inside <p>, so a paragraph holding a note is emitted as
// <div class="p"> (styled the same as <p>).

const MARK = /\[\^([\w-]+)\]/g;

const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

export default function rehypeSidenotes() {
  return (tree, file) => {
    const notes = file.data?.astro?.frontmatter?.notes ?? [];
    const byId = new Map(notes.map((n) => [n.id, n]));
    let count = 0;

    const build = (id) => {
      const note = byId.get(id);
      if (!note) throw new Error(`[sidenotes] note "${id}" is not defined in frontmatter (${file.path})`);
      const num = String(++count);
      const ref = el('sup', { id: `ref-${id}`, className: ['note-ref'], dataNote: id }, [
        el('a', { href: `#note-${id}`, ariaLabel: `注${num}` }, [text(num)]),
      ]);
      const aside = el('aside', { id: `note-${id}`, className: ['sidenote'], dataNote: id }, [
        el('span', { className: ['sidenote-head'] }, [
          el('a', { href: `#ref-${id}`, className: ['note-num'], ariaLabel: `本文の注${num}へ戻る` }, [text(num)]),
          text(note.title),
        ]),
        ...(note.cite ? [el('span', { className: ['sidenote-cite'] }, [text(note.cite)])] : []),
        el('span', { className: ['sidenote-body'] }, [text(note.body)]),
      ]);
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
  };
}
