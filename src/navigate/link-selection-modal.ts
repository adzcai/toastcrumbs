import { App, FrontmatterLinkCache, FuzzySuggestModal } from 'obsidian';

/** Fuzzy picker over a note's frontmatter links. */
export class LinkSelectionModal extends FuzzySuggestModal<FrontmatterLinkCache> {
	constructor(
		app: App,
		private readonly sourcePath: string,
		private readonly links: FrontmatterLinkCache[],
		private readonly showKey: boolean,
	) {
		super(app);
	}

	getItems(): FrontmatterLinkCache[] {
		return this.links;
	}

	getItemText(item: FrontmatterLinkCache): string {
		const text = item.displayText ?? item.link;
		return this.showKey ? `${text} (${item.key})` : text;
	}

	onChooseItem(item: FrontmatterLinkCache): void {
		void this.app.workspace.openLinkText(item.link, this.sourcePath);
	}
}
