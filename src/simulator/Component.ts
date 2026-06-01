// src/simulator/Component.ts
import type { Node } from './Node'

export abstract class Component {
  id: string
  abstract terminals: Record<string, Node>  // e.g. { anode, cathode }

  constructor(id: string) { this.id = id }

  // Each subclass stamps its equations into the MNA system
  abstract stamp(
    G: number[][],   // conductance matrix
    b: number[],     // current/voltage vector
    nodeIndex: Map<string, number>
  ): void
}