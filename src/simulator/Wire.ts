import type { Node, NodeId } from './Node'

export type WireId = string

export class Wire {
  readonly id: WireId
  from: Node
  to: Node

  /** Current through this wire in amperes, resolved by the solver. */
  current: number = 0

  /**
   * When not null, the solver inserts an independent current source
   * between from and to with this value. Set by the user.
   */
  forcedCurrent: number | null = null

  constructor(id: WireId, from: Node, to: Node) {
    this.id = id
    this.from = from
    this.to = to
  }

  get isConstrained(): boolean {
    return this.forcedCurrent !== null
  }

  /** The two node IDs this wire connects. */
  get nodeIds(): [NodeId, NodeId] {
    return [this.from.id, this.to.id]
  }

  /**
   * Stamps an independent current source into the MNA b-vector.
   * Called by Solver when forcedCurrent is not null.
   *
   *  b[from] -= I   (current leaving the from-node)
   *  b[to]   += I   (current entering the to-node)
   */
  stampCurrentSource(b: number[], nodeIndex: Map<NodeId, number>): void {
    if (this.forcedCurrent === null) return
    const f = this.from.matrixIndex(nodeIndex)
    const t = this.to.matrixIndex(nodeIndex)
    b[f] -= this.forcedCurrent
    b[t] += this.forcedCurrent
  }
}