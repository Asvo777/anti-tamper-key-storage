// src/components/Canvas.tsx
import { Fragment } from 'react'
import { Stage, Layer, Circle, Line, Text, Rect, Group } from 'react-konva'
import type { Node } from '../simulator/Node'
import type { Wire } from '../simulator/Wire'
import type { Component as SimComponent } from '../simulator/Component'

type CanvasProps = {
  width: number
  height: number
  nodes: Node[]
  wires: Wire[]
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string) => void
  onNodeMove: (nodeId: string, x: number, y: number) => void
  onComponentMove: (componentId: string, x: number, y: number) => void
  // wire drag lifecycle
  onStartWire: (nodeId: string, x: number, y: number) => void
  onUpdateWire: (x: number, y: number) => void
  onFinishWire: (targetNodeId: string | null, x: number, y: number) => void
  tempWire: { x1: number; y1: number; x2: number; y2: number } | null
  components?: SimComponent[]
}

export function Canvas({ width, height, nodes, wires, selectedNodeId, onNodeSelect, onNodeMove, onComponentMove, onStartWire, onUpdateWire, onFinishWire, tempWire, components }: CanvasProps) {
  return (
    <Stage
      width={width}
      height={height}
      onMouseMove={(e) => {
        if (!e.evt) return
        const pos = e.target.getStage()?.getPointerPosition()
        if (pos) onUpdateWire(pos.x, pos.y)
      }}
      onMouseUp={(e) => {
        if (!e.evt) return
        const target = e.target as { id?: () => string }
        const targetId = target && typeof target.id === 'function' ? String(target.id()) : null
        const pos = e.target.getStage()?.getPointerPosition()
        onFinishWire(targetId, pos?.x ?? 0, pos?.y ?? 0)
      }}
    >
      <Layer>
        {wires.map((wire) => (
          <Line
            key={wire.id}
            points={[wire.from.x, wire.from.y, wire.to.x, wire.to.y]}
            stroke="#94a3b8"
            strokeWidth={4}
            lineCap="round"
          />
        ))}

        {/* Render simple component visuals (resistors) */}
        {/** components prop may be undefined in older calls */}
        {(Array.isArray(components) ? components : [])
          .map((c: SimComponent) => {
            // only render Resistor-like components that have terminals.a and terminals.b
            const terms = (c as unknown as { terminals?: { a?: Node; b?: Node } }).terminals
            if (!terms || !terms.a || !terms.b) return null
            const a = terms.a
            const b = terms.b
            const dx = b.x - a.x
            const dy = b.y - a.y
            const midX = a.x + dx / 2
            const midY = a.y + dy / 2
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI
            return (
              <Group
                key={c.id}
                x={midX}
                y={midY}
                rotation={angle}
                draggable
                onDragMove={(e) => onComponentMove(c.id, e.target.x(), e.target.y())}
              >
                <Line points={[-dx / 2, 0, -20, 0]} stroke="#94a3b8" strokeWidth={3} />
                <Rect x={-20} y={-6} width={40} height={12} fill="#f97316" />
                <Line points={[20, 0, dx / 2, 0]} stroke="#94a3b8" strokeWidth={3} />
              </Group>
            )
          })}

        {tempWire ? (
          <Line key="__temp_wire" points={[tempWire.x1, tempWire.y1, tempWire.x2, tempWire.y2]} stroke="#fb7185" strokeWidth={3} dash={[8, 6]} />
        ) : null}

        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId
          return (
            <Fragment key={node.id}>
              <Circle
                id={node.id}
                x={node.x}
                y={node.y}
                radius={20}
                fill={isSelected ? '#fb7185' : node.forcedVoltage !== null ? '#38bdf8' : '#0f172a'}
                opacity={node.inactive ? 0.45 : 1}
                stroke="#e2e8f0"
                strokeWidth={2}
                draggable={!node.inactive}
                onClick={() => onNodeSelect(node.id)}
                onTap={() => onNodeSelect(node.id)}
                onDragStart={(e) => {
                  // allow dragging only while holding Shift
                  if (!e.evt.shiftKey) {
                    e.target.stopDrag()
                    onStartWire(node.id, node.x, node.y)
                  }
                }}
                onDragMove={(e) => {
                  // only fire move when dragging (Shift held)
                  if (e.evt.shiftKey) onNodeMove(node.id, e.target.x(), e.target.y())
                }}
                onMouseDown={(e) => {
                  // start wire on mousedown if Shift not held
                  if (!e.evt.shiftKey && !node.inactive) onStartWire(node.id, node.x, node.y)
                }}
              />
              <Text x={node.x - 40} y={node.y + 26} width={80} align="center" fontSize={12} fill="#0f172a" listening={false} text={`${node.id}\n${node.voltage.toFixed(2)} V`} />
            </Fragment>
          )
        })}
      </Layer>
    </Stage>
  )
}