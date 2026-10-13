import {
	ItemView,
	Keymap,
	setIcon,
	TFile,
	ViewStateResult,
	WorkspaceLeaf,
} from 'obsidian';
import { CHILD_PAGE_SIZE, VIEW_TYPE_HIERARCHY } from '../constants';
import {
	Direction,
	HierarchyIndex,
	isUnresolved,
	NodeId,
} from '../graph/hierarchy-index';

const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});

/**
 * Tree of notes below (or above) the active note, following up/down
 * frontmatter links.
 * Only expanded nodes are rendered, so cycles and large graphs stay cheap.
 */
export class HierarchyView extends ItemView {
	private rootId: NodeId | null = null;
	private pinned = false;
	private pinAction: HTMLElement | null = null;
	private direction: Direction = 'down';
	private directionAction: HTMLElement | null = null;
	private treeEl: HTMLElement | null = null;
	/** Keys of expanded nodes; a key is the chain of ids from the root. */
	private expanded = new Set<string>();
	/** Key -> number of children shown (for "Show more"). */
	private shownCounts = new Map<string, number>();

	constructor(
		leaf: WorkspaceLeaf,
		private readonly index: HierarchyIndex,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_HIERARCHY;
	}

	getDisplayText(): string {
		return 'Hierarchy';
	}

	getIcon(): string {
		return 'git-fork';
	}

	async onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass('toastcrumbs-view');
		// Own toolbar: view-header actions are hidden in sidebars by default.
		const buttonsEl = this.contentEl
			.createDiv({ cls: 'nav-header' })
			.createDiv({ cls: 'nav-buttons-container' });
		this.directionAction = this.addToolbarButton(buttonsEl, () =>
			this.setDirection(this.direction === 'down' ? 'up' : 'down'),
		);
		this.pinAction = this.addToolbarButton(buttonsEl, () => this.togglePin());
		this.updateDirectionAction();
		this.updatePinAction();
		this.treeEl = this.contentEl.createDiv({ cls: 'toastcrumbs-tree' });
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => this.setRoot(file)),
		);
		this.registerEvent(this.index.on('updated', () => this.render()));
		this.setRoot(this.app.workspace.getActiveFile());
	}

	async onClose() {
		this.contentEl.empty();
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), direction: this.direction };
	}

	async setState(state: unknown, result: ViewStateResult) {
		const dir = (state as { direction?: unknown } | null)?.direction;
		if (dir === 'up' || dir === 'down') this.setDirection(dir);
		await super.setState(state, result);
	}

	private addToolbarButton(parentEl: HTMLElement, onClick: () => void) {
		const el = parentEl.createDiv({
			cls: 'clickable-icon nav-action-button',
		});
		el.addEventListener('click', onClick);
		return el;
	}

	private setDirection(dir: Direction) {
		if (dir === this.direction) return;
		this.direction = dir;
		this.updateDirectionAction();
		this.expanded.clear();
		this.shownCounts.clear();
		if (this.rootId) this.expanded.add(this.rootId);
		this.render();
		this.app.workspace.requestSaveLayout();
	}

	private updateDirectionAction() {
		const el = this.directionAction;
		if (!el) return;
		const down = this.direction === 'down';
		setIcon(el, down ? 'arrow-down' : 'arrow-up');
		el.setAttr(
			'aria-label',
			down
				? 'Showing children; switch to parents'
				: 'Showing parents; switch to children',
		);
	}

	private togglePin() {
		this.pinned = !this.pinned;
		this.updatePinAction();
		if (!this.pinned) this.setRoot(this.app.workspace.getActiveFile());
	}

	private updatePinAction() {
		const el = this.pinAction;
		if (!el) return;
		setIcon(el, this.pinned ? 'pin-off' : 'pin');
		el.toggleClass('is-active', this.pinned);
		el.setAttr('aria-label', this.pinned ? 'Unpin root' : 'Pin current root');
	}

	private setRoot(file: TFile | null) {
		if (this.pinned) return;
		const id = file?.path ?? null;
		if (id === this.rootId) return;
		this.rootId = id;
		this.expanded.clear();
		this.shownCounts.clear();
		if (id) this.expanded.add(id);
		this.render();
	}

	private render() {
		const treeEl = this.treeEl;
		if (!treeEl) return;
		const scrollTop = treeEl.scrollTop;
		treeEl.empty();
		if (!this.rootId) {
			treeEl.createDiv({
				cls: 'pane-empty',
				text: 'Open a note to see its hierarchy.',
			});
			return;
		}
		this.renderNode(treeEl, this.rootId, [], this.rootId);
		treeEl.scrollTop = scrollTop;
	}

	private renderNode(
		parentEl: HTMLElement,
		id: NodeId,
		ancestors: NodeId[],
		key: string,
	) {
		const isCycle = ancestors.includes(id);
		const expandable = !isCycle && this.index.hasNeighbors(id, this.direction);
		const isOpen = expandable && this.expanded.has(key);

		const itemEl = parentEl.createDiv({ cls: 'tree-item' });
		const selfEl = itemEl.createDiv({
			cls: 'tree-item-self is-clickable',
		});
		if (isUnresolved(id)) selfEl.addClass('is-unresolved');
		if (id === this.app.workspace.getActiveFile()?.path) {
			selfEl.addClass('is-active');
		}

		let childrenEl: HTMLElement | null = null;
		if (expandable) {
			selfEl.addClass('mod-collapsible');
			const iconEl = selfEl.createDiv({
				cls: 'tree-item-icon collapse-icon',
			});
			setIcon(iconEl, 'right-triangle');
			iconEl.toggleClass('is-collapsed', !isOpen);
			itemEl.toggleClass('is-collapsed', !isOpen);
			iconEl.addEventListener('click', (evt) => {
				evt.stopPropagation();
				const nowOpen = !this.expanded.has(key);
				if (nowOpen) this.expanded.add(key);
				else this.expanded.delete(key);
				iconEl.toggleClass('is-collapsed', !nowOpen);
				itemEl.toggleClass('is-collapsed', !nowOpen);
				if (nowOpen) {
					childrenEl = itemEl.createDiv({ cls: 'tree-item-children' });
					this.renderChildren(childrenEl, id, [...ancestors, id], key);
				} else {
					childrenEl?.remove();
					childrenEl = null;
				}
			});
		}

		selfEl.createDiv({
			cls: 'tree-item-inner',
			text: this.index.displayName(id),
		});
		if (isCycle) {
			const flairEl = selfEl.createDiv({ cls: 'tree-item-flair-outer' });
			const cycleEl = flairEl.createSpan({ cls: 'toastcrumbs-cycle' });
			setIcon(cycleEl, 'repeat');
			cycleEl.setAttr('aria-label', 'Already shown above');
		} else if (expandable) {
			const flairEl = selfEl.createDiv({ cls: 'tree-item-flair-outer' });
			flairEl.createSpan({
				cls: 'tree-item-flair',
				text: String(this.index.neighbors(id, this.direction).length),
			});
		}

		selfEl.addEventListener('click', (evt) => this.openNode(id, evt));
		selfEl.addEventListener('mouseover', (evt) => {
			if (isUnresolved(id)) return;
			this.app.workspace.trigger('hover-link', {
				event: evt,
				source: VIEW_TYPE_HIERARCHY,
				hoverParent: this,
				targetEl: selfEl,
				linktext: id,
				sourcePath: '',
			});
		});

		if (isOpen) {
			childrenEl = itemEl.createDiv({ cls: 'tree-item-children' });
			this.renderChildren(childrenEl, id, [...ancestors, id], key);
		}
	}

	private renderChildren(
		el: HTMLElement,
		id: NodeId,
		ancestors: NodeId[],
		key: string,
	) {
		const children = this.index
			.neighbors(id, this.direction)
			.map((c) => ({ id: c, name: this.index.displayName(c) }))
			.sort((a, b) => collator.compare(a.name, b.name));
		const shown = this.shownCounts.get(key) ?? CHILD_PAGE_SIZE;
		for (const child of children.slice(0, shown)) {
			this.renderNode(el, child.id, ancestors, `${key}\0${child.id}`);
		}
		if (children.length > shown) {
			const moreEl = el.createDiv({
				cls: 'tree-item-self is-clickable toastcrumbs-more',
				text: `Show ${children.length - shown} more`,
			});
			moreEl.addEventListener('click', () => {
				this.shownCounts.set(key, shown + CHILD_PAGE_SIZE);
				el.empty();
				this.renderChildren(el, id, ancestors, key);
			});
		}
	}

	private openNode(id: NodeId, evt: MouseEvent) {
		const newLeaf = Keymap.isModEvent(evt);
		if (isUnresolved(id)) {
			void this.app.workspace.openLinkText(
				this.index.linktext(id),
				'',
				newLeaf,
			);
			return;
		}
		const file = this.app.vault.getAbstractFileByPath(id);
		if (file instanceof TFile) {
			void this.app.workspace.getLeaf(newLeaf).openFile(file);
		}
	}
}
