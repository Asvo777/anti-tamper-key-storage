import type { Node } from './Node'
import { Component } from './Component'

export class Resistor extends Component {
  terminals: Record<string, Node>
  resistance: number

  constructor(id: string, a: Node, b: Node, resistance = 1000) {
    super(id)
    this.terminals = { a, b }
    this.resistance = resistance
  }

  stamp(G: number[][], _b: number[], nodeIndex: Map<string, number>): void {
    void _b
    const aIndex = this.terminals.a.matrixIndex(nodeIndex)
    const bIndex = this.terminals.b.matrixIndex(nodeIndex)
    const g = this.resistance === 0 ? 1e9 : 1 / this.resistance

    // Add conductance between a and b
    G[aIndex][aIndex] += g
    G[bIndex][bIndex] += g
    G[aIndex][bIndex] -= g
    G[bIndex][aIndex] -= g
  }
}

export default Resistor
