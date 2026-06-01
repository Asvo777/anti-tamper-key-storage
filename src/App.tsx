import { useMemo, useState, useEffect, useCallback } from 'react'
import './App.css'
import { Canvas } from './components/Canvas'
import { Sidebar } from './components/Sidebar'
import { Node } from './simulator/Node'
import { solve } from './simulator/Solver'
import { Wire } from './simulator/Wire'
import type { Component as SimComponent } from './simulator/Component'
import { Resistor } from './simulator/Resistor'

const getViewportWidth = () => (typeof window === 'undefined' ? 960 : window.innerWidth)
const getViewportHeight = () => (typeof window === 'undefined' ? 720 : window.innerHeight)

const createSampleCircuit = () => {
  const source = new Node('n1', 160, 180)
  source.forcedVoltage = 5
  const relay = new Node('n2', 360, 140)
  const load = new Node('n3', 520, 260)
  const ground = new Node('n4', 260, 340)
  ground.forcedVoltage = 0

  return {
    nodes: [source, relay, load, ground],
    wires: [
      new Wire('w1', source, relay),
      new Wire('w2', relay, load),
      new Wire('w3', ground, load),
    ],
  }
}

const syncComponentsToNodes = (currentComponents: SimComponent[], nextNodes: Node[]): SimComponent[] =>
  currentComponents.map((component) => {
    const terms = (component as unknown as { terminals?: { a?: Node; b?: Node } }).terminals
    const resistance = (component as unknown as { resistance?: number }).resistance
    if (!terms?.a || !terms?.b || resistance === undefined) return component

    const aId = terms.a.id
    const bId = terms.b.id
    const a = nextNodes.find((node) => node.id === aId)
    const b = nextNodes.find((node) => node.id === bId)
    if (!a || !b) return component

    return new Resistor(component.id, a, b, resistance)
  })

function App() {
  const sample = useMemo(() => createSampleCircuit(), [])
  const [nodes, setNodes] = useState(sample.nodes)
  const [wires, setWires] = useState(sample.wires)
  const [components, setComponents] = useState<SimComponent[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('n2')
  // wire builder UI removed; wires are created by dragging on canvas
  const [tempWire, setTempWire] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [wireCreationStartId, setWireCreationStartId] = useState<string | null>(null)
  const [forcedVoltageDraft, setForcedVoltageDraft] = useState('')

  const solved = useMemo(() => {
    // Create transient clones for solving so state isn't mutated in-place.
    const nodeClones = nodes.map((n) => {
      const c = new Node(n.id, n.x, n.y)
      c.forcedVoltage = n.forcedVoltage
      return c
    })
    const wireClones = wires.map((w) => {
      const from = nodeClones.find((x) => x.id === w.from.id)!
      const to = nodeClones.find((x) => x.id === w.to.id)!
      return new Wire(w.id, from, to)
    })

    // Clone components and rewire their node references to clones
    const componentClones: SimComponent[] = []
    for (const component of components) {
      const terms = (component as unknown as { terminals?: { a?: Node; b?: Node } }).terminals
      const resistance = (component as unknown as { resistance?: number }).resistance
      if (!terms?.a || !terms?.b || resistance === undefined) continue

      const aId = terms.a.id
      const bId = terms.b.id
      const a = nodeClones.find((x) => x.id === aId)
      const b = nodeClones.find((x) => x.id === bId)
      if (!a || !b) continue

      componentClones.push(new Resistor(component.id, a, b, resistance))
    }

    const wireDegree = new Map<string, number>()
    for (const wire of wireClones) {
      wireDegree.set(wire.from.id, (wireDegree.get(wire.from.id) ?? 0) + 1)
      wireDegree.set(wire.to.id, (wireDegree.get(wire.to.id) ?? 0) + 1)
    }

    const componentAttachment = new Set<string>()
    for (const component of componentClones) {
      const terms = (component as unknown as { terminals?: { a?: Node; b?: Node } }).terminals
      if (terms?.a) componentAttachment.add(terms.a.id)
      if (terms?.b) componentAttachment.add(terms.b.id)
    }

    for (const node of nodeClones) {
      const degree = wireDegree.get(node.id) ?? 0
      node.inactive = degree === 2 && !componentAttachment.has(node.id)
    }

    solve({ nodes: nodeClones, wires: wireClones, components: componentClones })
    return { nodes: nodeClones, wires: wireClones, components: componentClones }
  }, [nodes, wires, components])

  const updateNodes = (nextNodes: Node[]) => {
    const nextComponents = syncComponentsToNodes(components, nextNodes)
    setNodes(nextNodes)
    setComponents(nextComponents)
    setWires((currentWires) =>
      currentWires.map((wire) => {
        const nextFrom = nextNodes.find((node) => node.id === wire.from.id) ?? wire.from
        const nextTo = nextNodes.find((node) => node.id === wire.to.id) ?? wire.to
        return new Wire(wire.id, nextFrom, nextTo)
      }),
    )
  }

  const handleAddNode = useCallback(() => {
    const nextIndex = nodes.length + 1
    const nextNode = new Node(`n${nextIndex}`, 160 + nextIndex * 40, 120 + nextIndex * 28)
    setNodes((currentNodes) => [...currentNodes, nextNode])
    setSelectedNodeId(nextNode.id)
    // select new node
  }, [nodes])

  // Apply forced voltage immediately as the user types
  const handleForcedVoltageChange = (value: string) => {
    setForcedVoltageDraft(value)
    if (!selectedNodeId) return
    const nextVoltage = value.trim() === '' ? null : Number(value)
    if (nextVoltage !== null && Number.isNaN(nextVoltage)) return
    const target = nodes.find((node) => node.id === selectedNodeId)
    if (target?.inactive) return
    updateNodes(
      nodes.map((node) => {
        const nn = new Node(node.id, node.x, node.y)
        nn.forcedVoltage = node.forcedVoltage
        if (nn.id === selectedNodeId) nn.forcedVoltage = nextVoltage
        return nn
      }),
    )
  }

  // reset sample removed; use Clear to empty canvas

  const handleClear = () => {
    setNodes([])
    setWires([])
    setSelectedNodeId(null)
    setForcedVoltageDraft('')
  }

  const handleStartWire = (nodeId: string, x: number, y: number) => {
    setWireCreationStartId(nodeId)
    setTempWire({ x1: x, y1: y, x2: x, y2: y })
    setSelectedNodeId(nodeId)
    // track start node id only
  }

  const handleUpdateWire = (x: number, y: number) => {
    if (!wireCreationStartId) return
    setTempWire((t) => (t ? { ...t, x2: x, y2: y } : null))
  }

  const handleFinishWire = (targetNodeId: string | null, _x: number, _y: number) => {
    if (!wireCreationStartId) return
    const startId = wireCreationStartId
    setWireCreationStartId(null)
    setTempWire(null)

    void _x
    void _y

    // targetNodeId may be Konva id or null
    const normalizedTarget = targetNodeId && String(targetNodeId).startsWith('n') ? targetNodeId : null
    if (!normalizedTarget || normalizedTarget === startId) return

    const from = nodes.find((n) => n.id === startId)
    const to = nodes.find((n) => n.id === normalizedTarget)
    if (!from || !to) return

    const wireId = `w${wires.length + 1}`
    setWires((current) => [...current, new Wire(wireId, from, to)])
  }

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return
    setNodes((current) => current.filter((n) => n.id !== selectedNodeId))
    setWires((current) => current.filter((w) => w.from.id !== selectedNodeId && w.to.id !== selectedNodeId))
    setComponents((current) => current.filter((component) => {
      const terms = (component as unknown as { terminals?: { a?: Node; b?: Node } }).terminals
      return !(terms?.a?.id === selectedNodeId || terms?.b?.id === selectedNodeId)
    }))
    setSelectedNodeId(null)
  }, [selectedNodeId])

  const handleComponentMove = (componentId: string, x: number, y: number) => {
    const component = components.find((entry) => entry.id === componentId)
    const terminals = component ? (component as unknown as { terminals?: { a?: Node; b?: Node } }).terminals : undefined
    if (!component || !terminals?.a || !terminals?.b) return

    const aNode = terminals.a
    const bNode = terminals.b
    const centerX = (aNode.x + bNode.x) / 2
    const centerY = (aNode.y + bNode.y) / 2
    const dx = x - centerX
    const dy = y - centerY

    updateNodes(
      nodes.map((node) => {
        const nn = new Node(node.id, node.x, node.y)
        nn.forcedVoltage = node.forcedVoltage
        nn.inactive = node.inactive
        if (node.id === aNode.id || node.id === bNode.id) {
          nn.x = node.x + dx
          nn.y = node.y + dy
        }
        return nn
      }),
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        handleAddNode()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected()
      }
      if (e.key === 'r' || e.key === 'R') {
        // create a resistor: if a node is selected, connect it to a new node; otherwise create two nodes
        if (selectedNodeId) {
          const base = nodes.find((n) => n.id === selectedNodeId)
          if (!base) return
          const nextIndex = nodes.length + 1
          const newNode = new Node(`n${nextIndex}`, base.x + 140, base.y)
          const rid = `R${components.length + 1}`
          const r = new Resistor(rid, base, newNode, 1000)
          setNodes((cur) => [...cur, newNode])
          setComponents((cur) => [...cur, r])
        } else {
          const idx = nodes.length
          const a = new Node(`n${idx + 1}`, 200, 200)
          const b = new Node(`n${idx + 2}`, 360, 200)
          const rid = `R${components.length + 1}`
          const r = new Resistor(rid, a, b, 1000)
          setNodes((cur) => [...cur, a, b])
          setComponents((cur) => [...cur, r])
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nodes, selectedNodeId, wires, forcedVoltageDraft, components.length, handleAddNode, handleDeleteSelected])

  const selectedNode = solved.nodes.find((node) => node.id === selectedNodeId) ?? null
  const canvasWidth = Math.max(getViewportWidth() - 380, 640)
  const canvasHeight = Math.max(getViewportHeight() - 32, 640)

  // forced-voltage draft is synchronized when a node is selected in onNodeSelect

  return (
    <div className="app-shell">
      <Sidebar
        nodes={solved.nodes}
        wires={solved.wires}
        selectedNodeId={selectedNodeId}
        forcedVoltageDraft={forcedVoltageDraft}
        onAddNode={handleAddNode}
        onClear={handleClear}
        onForcedVoltageChange={handleForcedVoltageChange}
        onDeleteSelected={handleDeleteSelected}
      />

      <main className="canvas-panel">
        <div className="canvas-panel__header">
          <div>
            <p className="eyebrow">Interactive canvas</p>
                  <h2>{selectedNode ? `${selectedNode.id} at ${selectedNode.voltage.toFixed(2)} V` : 'Select a node'}</h2>
          </div>
          <div className="canvas-panel__meta">
            <span>{solved.nodes.length} nodes</span>
            <span>{solved.wires.length} wires</span>
          </div>
        </div>

        <Canvas
          width={canvasWidth}
          height={canvasHeight}
          nodes={solved.nodes}
          wires={solved.wires}
          components={solved.components}
          selectedNodeId={selectedNodeId}
          tempWire={tempWire}
          onStartWire={handleStartWire}
          onUpdateWire={handleUpdateWire}
          onFinishWire={handleFinishWire}
          onComponentMove={handleComponentMove}
          onNodeSelect={(nodeId) => {
            setSelectedNodeId(nodeId)
            const node = solved.nodes.find((candidate) => candidate.id === nodeId)
            setForcedVoltageDraft(node && node.forcedVoltage !== null && !node.inactive ? node.forcedVoltage.toString() : '')
          }}
          onNodeMove={(nodeId, x, y) => {
            updateNodes(
              nodes.map((node) => {
                const nn = new Node(node.id, node.x, node.y)
                nn.forcedVoltage = node.forcedVoltage
                nn.voltage = node.voltage
                nn.inactive = node.inactive
                if (nn.id === nodeId) {
                  nn.x = x
                  nn.y = y
                }
                return nn
              }),
            )
          }}
        />
      </main>
    </div>
  )
}

export default App
