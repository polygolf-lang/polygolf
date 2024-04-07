import type { Spine } from "./Spine";
import { InvariantError } from "./errors";

export interface DirectedGraphNode<T> {
  predecessors: T[];
  succesors: T[];
}

export type DirectedGraph<T> = Map<T, DirectedGraphNode<T>>;

export function getEntryPoint<T>(graph: DirectedGraph<T>): T {
  for (const [k, v] of graph.entries()) {
    if (v.predecessors.length === 0) return k;
  }
  throw new InvariantError("Entry point not found.");
}

export function getControlFlowGraph(spine: Spine): DirectedGraph<Spine> {
  throw new Error();
}

export function getDominanceGraph<T>(
  graph: DirectedGraph<T>,
): DirectedGraph<T> {
  throw new Error();
}
