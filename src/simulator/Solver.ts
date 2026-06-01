import { lusolve } from 'mathjs'
import type { Node, NodeId } from './Node'
import type { Wire } from './Wire'
import type { Component } from './Component'

export interface CircuitState {
  nodes: Node[]
  wires: Wire[]
  components: Component[]
}

/**
 * Modified Nodal Analysis solver.
 *
 * Builds the G·x = b system, stamps all components and sources,
 * applies forced-voltage constraints, then solves with math.js lusolve.
 * After solving, writes voltages back to each Node and currents to each Wire.
 */
export function solve(circuit: CircuitState): void {
  const { nodes, wires, components } = circuit;

  // --- 1. Index free nodes (skip ground — voltage forced to 0) ---
  const freeNodes = nodes.filter(n => !n.isConstrained)
  const groundNodes = nodes.filter(n => n.isConstrained)

  // Ground nodes that are forced to non-zero need an extra KVL row each.
  // We'll track how many extra rows we need.
  const extraRowCount = groundNodes.length
  const n = freeNodes.length + extraRowCount

  if (n === 0) return

  // Build node → matrix index map.
  // Free nodes occupy rows 0..freeNodes.length-1.
  // Constrained nodes get a virtual index used only for stamping;
  // their actual voltage is injected via extra rows.
  const nodeIndex = new Map<NodeId, number>()
  freeNodes.forEach((node, i) => nodeIndex.set(node.id, i))
  groundNodes.forEach((node, i) => nodeIndex.set(node.id, freeNodes.length + i))

  // --- 2. Allocate G (n×n) and b (n) ---
  const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  const b: number[] = new Array(n).fill(0)

  // --- 3. Stamp forced-voltage constraints (KVL rows) ---
  groundNodes.forEach((node, i) => {
    const row = freeNodes.length + i
    G[row][row] = 1
    b[row] = node.forcedVoltage ?? 0
  })

  // --- 4. Stamp all components ---
  for (const component of components) {
    // Component.stamp signature in this project takes (G, b, nodeIndex)
    component.stamp(G, b, nodeIndex)
  }

  // --- 5. Stamp forced-current wires as independent current sources ---
  for (const wire of wires) {
    if (wire.isConstrained) {
      wire.stampCurrentSource(b, nodeIndex)
    }
  }

  // --- 6. Solve ---
  let x: number[]
  try {
    const result = lusolve(G, b) as number[][]
    x = result.map(row => row[0])
  } catch {
    console.warn('Solver: singular matrix — circuit may be disconnected or over-constrained')
    return
  }

  // --- 7. Write results back to nodes ---
  freeNodes.forEach((node, i) => {
    node.voltage = x[i]
  })
  groundNodes.forEach(node => {
    node.voltage = node.forcedVoltage ?? 0
  })

  // --- 8. Compute wire currents from solved node voltages ---
  for (const wire of wires) {
    if (wire.isConstrained) {
      wire.current = wire.forcedCurrent ?? 0
    } else {
      // Ohm's law across the wire (zero resistance → KCL approximation)
      wire.current = wire.from.voltage - wire.to.voltage
    }
  }
}