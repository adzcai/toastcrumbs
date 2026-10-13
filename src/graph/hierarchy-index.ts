import {
	App,
	debounce,
	Events,
	getLinkpath,
	TAbstractFile,
	TFile,
} from 'obsidian';
import { UNRESOLVED_PREFIX } from '../constants';

/**
 * A node id is either a vault path (for existing files) or
 * `UNRESOLVED_PREFIX + lowercased linkpath` (for links to missing notes).
 */
export type NodeId = string;

type EdgeMap = Map<NodeId, Set<NodeId>>;

/** Which way the tree branches from its root. */
export type Direction = 'down' | 'up';

function addEdge(map: EdgeMap, from: NodeId, to: NodeId) {
	let set = map.get(from);
	if (!set) {
		set = new Set();
		map.set(from, set);
	}
	set.add(to);
}

function removeEdge(map: EdgeMap, from: NodeId, to: NodeId) {
	const set = map.get(from);
	if (!set) return;
	set.delete(to);
	if (set.size === 0) map.delete(from);
}

export function isUnresolved(id: NodeId): boolean {
	return id.startsWith(UNRESOLVED_PREFIX);
}

/**
 * In-memory index of the up/down hierarchy defined by frontmatter links.
 * `up` links are mirrored as `down` links on the target (and vice versa).
 * Updated incrementally from vault / metadata cache events.
 */
export class HierarchyIndex extends Events {
	private upKeys = new Set<string>();
	private downKeys = new Set<string>();

	/** Edges written in each file's own frontmatter. */
	private upOut: EdgeMap = new Map();
	private downOut: EdgeMap = new Map();
	/** Reverse edges. */
	private upIn: EdgeMap = new Map();
	private downIn: EdgeMap = new Map();

	/** Unresolved node id -> link text as written, for display. */
	private unresolvedNames = new Map<NodeId, string>();

	private readonly notifyUpdated = debounce(
		() => this.trigger('updated'),
		200,
		true,
	);

	constructor(private readonly app: App) {
		super();
	}

	setKeys(upKeys: string[], downKeys: string[]) {
		this.upKeys = new Set(upKeys.map((k) => k.toLowerCase()));
		this.downKeys = new Set(downKeys.map((k) => k.toLowerCase()));
	}

	/** Rebuild everything from the metadata cache. */
	rebuild() {
		this.upOut.clear();
		this.downOut.clear();
		this.upIn.clear();
		this.downIn.clear();
		this.unresolvedNames.clear();
		for (const file of this.app.vault.getMarkdownFiles()) {
			this.addOutEdges(file);
		}
		this.notifyUpdated();
	}

	children(id: NodeId): NodeId[] {
		return this.union(this.downOut.get(id), this.upIn.get(id));
	}

	parents(id: NodeId): NodeId[] {
		return this.union(this.upOut.get(id), this.downIn.get(id));
	}

	/** Children when branching down, parents when branching up. */
	neighbors(id: NodeId, dir: Direction): NodeId[] {
		return dir === 'down' ? this.children(id) : this.parents(id);
	}

	hasNeighbors(id: NodeId, dir: Direction): boolean {
		return dir === 'down'
			? !!(this.downOut.get(id)?.size || this.upIn.get(id)?.size)
			: !!(this.upOut.get(id)?.size || this.downIn.get(id)?.size);
	}

	displayName(id: NodeId): string {
		if (isUnresolved(id)) return this.unresolvedNames.get(id) ?? id;
		const slash = id.lastIndexOf('/');
		const name = slash === -1 ? id : id.slice(slash + 1);
		return name.endsWith('.md') ? name.slice(0, -3) : name;
	}

	/** Link text for an unresolved node, suitable for `openLinkText`. */
	linktext(id: NodeId): string {
		return isUnresolved(id) ? this.displayName(id) : id;
	}

	// --- event handlers ---------------------------------------------------

	onMetadataChanged(file: TFile) {
		if (file.extension !== 'md') return;
		this.removeOutEdges(file.path);
		this.addOutEdges(file);
		this.notifyUpdated();
	}

	onCreate(file: TAbstractFile) {
		if (!(file instanceof TFile)) return;
		this.reindexSourcesOf(this.unresolvedIdsFor(file));
		this.notifyUpdated();
	}

	onDelete(file: TAbstractFile) {
		if (!(file instanceof TFile)) return;
		this.removeOutEdges(file.path);
		// Notes that linked to this file now point to an unresolved link.
		this.reindexSourcesOf([file.path]);
		this.notifyUpdated();
	}

	onRename(file: TAbstractFile, oldPath: string) {
		if (!(file instanceof TFile)) return;
		this.removeOutEdges(oldPath);
		if (file.extension === 'md') this.addOutEdges(file);
		this.reindexSourcesOf([oldPath, ...this.unresolvedIdsFor(file)]);
		this.notifyUpdated();
	}

	// --- internals --------------------------------------------------------

	private union(a?: Set<NodeId>, b?: Set<NodeId>): NodeId[] {
		if (!a) return b ? [...b] : [];
		if (!b) return [...a];
		const out = new Set(a);
		for (const x of b) out.add(x);
		return [...out];
	}

	/** Unresolved ids that a newly created/renamed file might now satisfy. */
	private unresolvedIdsFor(file: TFile): NodeId[] {
		const noExt = file.path.slice(
			0,
			file.path.length - file.extension.length - 1,
		);
		const candidates = new Set([
			file.basename.toLowerCase(),
			file.name.toLowerCase(),
			noExt.toLowerCase(),
			file.path.toLowerCase(),
		]);
		return [...candidates].map((c) => UNRESOLVED_PREFIX + c);
	}

	/** Re-read every file that has an edge pointing at one of `targets`. */
	private reindexSourcesOf(targets: NodeId[]) {
		const sources = new Set<string>();
		for (const t of targets) {
			this.upIn.get(t)?.forEach((s) => sources.add(s));
			this.downIn.get(t)?.forEach((s) => sources.add(s));
		}
		for (const path of sources) {
			this.removeOutEdges(path);
			const f = this.app.vault.getAbstractFileByPath(path);
			if (f instanceof TFile) this.addOutEdges(f);
		}
	}

	private removeOutEdges(path: string) {
		for (const [out, inn] of [
			[this.upOut, this.upIn],
			[this.downOut, this.downIn],
		] as const) {
			const targets = out.get(path);
			if (!targets) continue;
			for (const t of targets) {
				removeEdge(inn, t, path);
				if (isUnresolved(t) && !this.upIn.has(t) && !this.downIn.has(t)) {
					this.unresolvedNames.delete(t);
				}
			}
			out.delete(path);
		}
	}

	private addOutEdges(file: TFile) {
		const links = this.app.metadataCache.getFileCache(file)?.frontmatterLinks;
		if (!links) return;
		for (const link of links) {
			const dot = link.key.indexOf('.');
			const key = (dot === -1 ? link.key : link.key.slice(0, dot)).toLowerCase();
			const isUp = this.upKeys.has(key);
			const isDown = this.downKeys.has(key);
			if (!isUp && !isDown) continue;

			const target = this.resolve(link.link, file.path);
			if (target === file.path) continue;
			if (isUp) {
				addEdge(this.upOut, file.path, target);
				addEdge(this.upIn, target, file.path);
			}
			if (isDown) {
				addEdge(this.downOut, file.path, target);
				addEdge(this.downIn, target, file.path);
			}
		}
	}

	private resolve(link: string, sourcePath: string): NodeId {
		const linkpath = getLinkpath(link);
		const dest = this.app.metadataCache.getFirstLinkpathDest(
			linkpath,
			sourcePath,
		);
		if (dest) return dest.path;
		const id = UNRESOLVED_PREFIX + linkpath.toLowerCase();
		if (!this.unresolvedNames.has(id)) this.unresolvedNames.set(id, linkpath);
		return id;
	}
}
