export type NodeId = string

export class Node {
  readonly id: NodeId

  /** Voltage at this node, resolved by the MNA solver after each solve() call. */
  voltage: number = 0

  /**
   * When not null, the solver treats this as a fixed voltage source
   * (adds a constraint row to the MNA matrix instead of solving freely).
   * Set by the user via the sidebar inspector.
   */
  forcedVoltage: number | null = null

  /** Display position on the Konva canvas (pixels). */
  x: number
  y: number

  /** Passive pass-through nodes cannot be assigned a forced voltage. */
  inactive: boolean = false

  constructor(id: NodeId, x: number, y: number) {
    this.id = id
    this.x = x
    this.y = y
  }

  /** True when this node's voltage is user-constrained (voltage source / ground). */
  get isConstrained(): boolean {
    return this.forcedVoltage !== null && !this.inactive
  }

  /**
   * Returns the index this node occupies in the MNA matrix.
   * The nodeIndex map is built by the Solver before stamping.
   */
  matrixIndex(nodeIndex: Map<NodeId, number>): number {
    const idx = nodeIndex.get(this.id)
    if (idx === undefined) throw new Error(`Node ${this.id} not found in matrix index`)
    return idx
  }
}