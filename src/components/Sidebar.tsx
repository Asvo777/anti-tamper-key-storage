import type { Node } from '../simulator/Node'
import type { Wire } from '../simulator/Wire'

type Props = {
	nodes: Node[]
	wires: Wire[]
	selectedNodeId: string | null
	forcedVoltageDraft: string
	onAddNode: () => void
	onClear: () => void
	onForcedVoltageChange: (value: string) => void
	onDeleteSelected: () => void
}

export function Sidebar({
	nodes,
	wires,
	selectedNodeId,
	forcedVoltageDraft,
	onAddNode,
	onForcedVoltageChange,
	onClear,
	onDeleteSelected,
}: Props) {
	const selected = nodes.find((n) => n.id === selectedNodeId) ?? null

	return (
		<aside className="sidebar">
			<div className="sidebar__header">
				<p className="eyebrow">Circuit map</p>
				<h1>Lay out a simple network</h1>
				<p className="sidebar__lead">Add nodes, connect them with wires, drag nodes to reposition, and force node voltages.</p>
			</div>

			<div className="sidebar__panel">
				<button type="button" onClick={onAddNode}>Add node</button>
				<button type="button" className="secondary" onClick={onClear}>Clear</button>
			</div>

			<div className="sidebar__panel">
				<h2>Selected node</h2>
				<p className="sidebar__hint">{selected ? selected.id : 'None selected'}</p>
				{selected ? (
					<>
						<p className="sidebar__hint">Voltage: {selected.voltage.toFixed(3)} V</p>
						{selected.inactive ? <p className="sidebar__hint">Inactive pass-through node</p> : null}
						<div className="sidebar__hint">Connected wires:</div>
						<ul>
							{wires.filter((w) => w.from.id === selected.id || w.to.id === selected.id).map((w) => (
								<li key={w.id}>{w.id}: {w.current.toFixed(3)} A</li>
							))}
						</ul>
					</>
				) : null}
				<label htmlFor="forced-voltage">Forced voltage</label>
				<div className="sidebar__row">
					<input id="forced-voltage" type="number" step="0.1" value={forcedVoltageDraft} disabled={selected?.inactive ?? false} onChange={(e) => onForcedVoltageChange(e.target.value)} />
					<button type="button" className="danger" onClick={onDeleteSelected}>Delete</button>
				</div>
			</div>

			{/* Wire builder removed: use drag-to-create and keyboard shortcuts */}

			<div className="sidebar__panel">
				<h2>Network</h2>
				<div className="sidebar__stats">
					<span>{nodes.length} nodes</span>
					<span>{wires.length} wires</span>
				</div>
			</div>
		</aside>
	)
}
