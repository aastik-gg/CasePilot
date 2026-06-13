import type { DocumentNode } from "@/domain/schemas/document";

interface TreeNode extends DocumentNode {
  children: TreeNode[];
}

function buildTree(nodes: DocumentNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const n of nodes) byId.set(n.id, { ...n, children: [] });
  const roots: TreeNode[] = [];
  for (const n of byId.values()) {
    const parent = n.parentId ? byId.get(n.parentId) : null;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    list.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

function Node({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <li id={`node-${node.id}`} className="scroll-mt-20">
      <div
        className="grid grid-cols-[5rem_1fr] gap-3 border-l border-[var(--paper-edge)] py-2 pl-4"
        style={{ marginLeft: depth * 16 }}
      >
        <span className="mono text-xs text-[var(--ink-3)]">{node.numberLabel ?? "—"}</span>
        <div>
          {node.heading && (
            <p className="text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
              {node.heading}
            </p>
          )}
          {node.text && (
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-[var(--ink-2)]">
              {node.text}
            </p>
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Renders the structured contract tree, numbering in the margin like a filing tab (FRONTEND_DESIGN §7.4). */
export function DocumentTree({ nodes }: { nodes: DocumentNode[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm text-[var(--ink-3)]">No structure extracted yet.</p>;
  }
  const tree = buildTree(nodes);
  return (
    <ul>
      {tree.map((n) => (
        <Node key={n.id} node={n} depth={0} />
      ))}
    </ul>
  );
}
