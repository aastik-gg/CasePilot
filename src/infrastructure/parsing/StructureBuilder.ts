import type { ParsedDocument, ParsedNode } from "@/domain/schemas/document";
import type { NodeType } from "@/domain/schemas/document";

/**
 * Builds the structured tree from page text (PRD F1.2/F1.3). Pure — no I/O.
 * Heuristic for P0: numbered headings ("7", "7.2", "7.2.1") become nodes; their depth sets
 * section/subsection/clause; intervening text is the node body; "Section X.Y" references are
 * captured as cross-references. (LLM-assisted structuring is a P1 fallback for messy PDFs.)
 */
const HEADING_RE = /^\s*(\d+(?:\.\d+)*)[.)]?\s+(.{0,160}?)\s*$/;
const XREF_RE = /\b[Ss]ection\s+(\d+(?:\.\d+)*)/g;

function nodeTypeForDepth(depth: number): NodeType {
  if (depth <= 1) return "section";
  if (depth === 2) return "subsection";
  return "clause";
}
function parentLabel(label: string): string | null {
  const i = label.lastIndexOf(".");
  return i === -1 ? null : label.slice(0, i);
}

export class StructureBuilder {
  build(pages: string[]): ParsedDocument {
    const lines: { text: string; page: number }[] = [];
    pages.forEach((p, pageIdx) => {
      for (const raw of p.split(/\r?\n/)) {
        const text = raw.trimEnd();
        if (text.trim().length) lines.push({ text, page: pageIdx + 1 });
      }
    });

    const nodes: ParsedNode[] = [];
    const keyByLabel = new Map<string, string>();
    let charCursor = 0;
    let order = 0;
    let current: (ParsedNode & { _body: string[] }) | null = null;
    let preamble: (ParsedNode & { _body: string[] }) | null = null;

    const finalize = (n: (ParsedNode & { _body: string[] }) | null) => {
      if (!n) return;
      const body = n._body.join("\n");
      n.text = n.heading ? (body ? `${n.heading}\n${body}` : n.heading) : body;
      n.charEnd = charCursor;
      charCursor += n.text.length + 1;
      n.charStart = n.charEnd - n.text.length;
      delete (n as { _body?: string[] })._body;
      nodes.push(n);
    };

    for (const { text, page } of lines) {
      const m = HEADING_RE.exec(text);
      if (m) {
        const [, label, heading] = m;
        finalize(current);
        const localKey = keyByLabel.has(label) ? `${label}#${order}` : label;
        keyByLabel.set(label, localKey);
        const depth = label.split(".").length;
        current = {
          localKey,
          parentKey: null, // resolved in a second pass
          orderIndex: order++,
          nodeType: nodeTypeForDepth(depth),
          numberLabel: label,
          heading: heading || null,
          text: "",
          pageStart: page,
          pageEnd: page,
          charStart: null,
          charEnd: null,
          _body: [],
        };
      } else if (current) {
        current._body.push(text);
        current.pageEnd = page;
      } else {
        if (!preamble) {
          preamble = {
            localKey: "preamble",
            parentKey: null,
            orderIndex: order++,
            nodeType: "paragraph",
            numberLabel: null,
            heading: null,
            text: "",
            pageStart: page,
            pageEnd: page,
            charStart: null,
            charEnd: null,
            _body: [],
          };
        }
        preamble._body.push(text);
        preamble.pageEnd = page;
      }
    }
    finalize(preamble);
    finalize(current);

    // Second pass: resolve parents by numeric-label prefix.
    for (const n of nodes) {
      if (!n.numberLabel) continue;
      const pl = parentLabel(n.numberLabel);
      if (pl && keyByLabel.has(pl)) n.parentKey = keyByLabel.get(pl)!;
    }

    // Cross-references.
    const crossReferences: ParsedDocument["crossReferences"] = [];
    for (const n of nodes) {
      let m: RegExpExecArray | null;
      XREF_RE.lastIndex = 0;
      while ((m = XREF_RE.exec(n.text)) !== null) {
        const target = m[1];
        if (target !== n.numberLabel) {
          crossReferences.push({ fromKey: n.localKey, rawText: m[0], targetNumberLabel: target });
        }
      }
    }

    return { pageCount: pages.length, nodes, crossReferences };
  }
}
