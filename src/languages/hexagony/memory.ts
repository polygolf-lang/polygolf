import type { Node } from "@/IR";

type EdgeSymbol = 0 | 1 | 2;

/**
 * Edges are indexed by the axial coordinates of the (westward)
 * adjacent hexagon, and a symbol 0 (NE), 1 (E) or 2 (SE) indicating
 * which of the three edges is meant.
 */

interface Edge {
  x: number;
  y: number;
  i: EdgeSymbol;
}

export class Pointer {
  edge: Edge;
  isCw: boolean;

  constructor(edge: Edge, isCw: boolean) {
    this.edge = edge;
    this.isCw = isCw;
  }

  goTo(edge: Edge, isCw?: boolean): string {
    return "TODO";
  }

  goAlongAndCopy(edges: Edge[]): string {
    return "TODO";
  }
}

interface Expr {
  kind: string;
}
type CopyPath = Edge[];
interface NodeEdgeData {
  preCopyPaths?: CopyPath[];
  postCopyPath?: CopyPath;
  appliedTo: Edge;
  negateResult?: boolean;
  isCw?: boolean | undefined;
}

export type ProgramEdgeData = Map<Expr, NodeEdgeData>;

/**
 * Bind based on binary interactions first.
 *
 * Strategies according to the number of variables already bound:
 * 0		Simply bind all to 3 neighbouring registers, preferring recyclation.
 * 1		Try binding the other 2 to the 2 neigbouring registers (try both sides), provided they are available. If the op is + or *, try both orders.
 * 2		Find shortest path between the two, try binding the third to every corresponding third edge to any two neigbouring edges on that path, provided it is available.
 * 		  For +,* allow both directions. For - allow it too, but mind the sign of the result.
 * 3		Unless they are bound perfectly, pretend one is unbound and go as in previous point.
 *
 * Then, traverse again and bind variables that are still unbound.
 */
export function resolveEdges(program: Node): ProgramEdgeData {
  const result = new Map<Expr, NodeEdgeData>(); // TODO
  return result;
}
