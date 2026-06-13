import type { DocumentNode } from "@/domain/schemas/document";
import type { Severity } from "@/domain/schemas/assessment";
import { severityColor } from "@/app/(ui)/lib/risk";

type Risk = { severity: string | null; clauseId: string };

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

/** Light background wash for a flagged clause, by severity. */
function wash(severity: string | null): string {
  if (!severity || severity === "low") return "color-mix(in srgb, var(--risk-standard) 10%, transparent)";
  return `color-mix(in srgb, ${severityColor(severity as Severity)} 12%, transparent)`;
}

function Node({
  node,
  depth,
  riskByNodeId,
}: {
  node: TreeNode;
  depth: number;
  riskByNodeId?: Map<string, Risk>;
}) {
  const risk = riskByNodeId?.get(node.id);
  return (
    <li id={`node-${node.id}`} className="scroll-mt-20">
      <div className="grid grid-cols-[3.5rem_1fr] gap-3 py-1.5" style={{ marginLeft: depth * 14 }}>
        <span className="mono pt-1 text-right text-xs text-[var(--ink-3)]">{node.numberLabel ?? ""}</span>
        <div>
          {node.heading && (
            <p
              className={depth <= 1 ? "text-[var(--ink)]" : "text-sm font-medium text-[var(--ink)]"}
              style={depth <= 1 ? { fontFamily: "var(--font-display)" } : undefined}
            >
              {node.heading}
            </p>
          )}
          {node.text &&
            (risk ? (
              <a
                href={`#clause-${risk.clauseId}`}
                className="mt-1 block rounded p-3 text-sm leading-relaxed text-[var(--ink-2)]"
                style={{
                  background: wash(risk.severity),
                  borderLeft: `2px solid ${severityColor(risk.severity as Severity)}`,
                }}
              >
                {node.text}
              </a>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink-2)]">{node.text}</p>
            ))}
        </div>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} riskByNodeId={riskByNodeId} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Document View — the contract on legal paper: margin § numbers, flagged clauses washed by risk. */
export function DocumentTree({
  nodes,
  riskByNodeId,
}: {
  nodes: DocumentNode[];
  riskByNodeId?: Map<string, Risk>;
}) {
  if (nodes.length === 0) {
    return <p className="text-sm text-[var(--ink-3)]">No structure extracted yet.</p>;
  }
  const tree = buildTree(nodes);
  return (
    <div className="mx-auto max-w-3xl rounded-[var(--radius)] border border-[var(--paper-edge)] bg-[var(--paper-2)] p-8 shadow-[var(--shadow-page)] max-md:p-5">
      <ul>
        {tree.map((n) => (
          <Node key={n.id} node={n} depth={0} riskByNodeId={riskByNodeId} />
        ))}
      </ul>
    </div>
  );
}
