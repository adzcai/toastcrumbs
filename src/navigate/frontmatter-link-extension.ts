import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from '@codemirror/view';

/** Length of the quote + brackets around a quoted frontmatter link. */
export const LINK_DELIMITER_LENGTH = 3;

const QUOTED_LINK = /^["']\[\[[^\]]+\]\]["']$/;

const linkStart = Decoration.mark({
	class: 'cm-formatting-link cm-formatting-link_formatting-link-start',
});
const linkBody = Decoration.mark({ class: 'cm-hmd-internal-link' });
const linkEnd = Decoration.mark({
	class: 'cm-formatting-link cm-formatting-link_formatting-link-end',
});

/**
 * Styles quoted `"[[links]]"` in frontmatter as internal links, and records
 * their ranges so the "follow link under cursor" command can find them.
 */
class FrontmatterLinkPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	private buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const tree = syntaxTree(view.state);
		for (const { from, to } of view.visibleRanges) {
			tree.iterate({
				from,
				to,
				enter(node) {
					if (node.name !== 'hmd-frontmatter_string') return;
					const text = view.state.sliceDoc(node.from, node.to);
					if (!QUOTED_LINK.test(text)) return;
					const bodyFrom = node.from + LINK_DELIMITER_LENGTH;
					const bodyTo = node.to - LINK_DELIMITER_LENGTH;
					builder.add(node.from, bodyFrom, linkStart);
					builder.add(bodyFrom, bodyTo, linkBody);
					builder.add(bodyTo, node.to, linkEnd);
				},
			});
		}
		return builder.finish();
	}
}

export const frontmatterLinkExtension = ViewPlugin.fromClass(
	FrontmatterLinkPlugin,
	{ decorations: (value) => value.decorations },
);

/**
 * The link target of the quoted frontmatter link at `pos` (including its
 * quotes and brackets), or null if there is none.
 */
export function frontmatterLinkAt(view: EditorView, pos: number): string | null {
	const plugin = view.plugin(frontmatterLinkExtension);
	if (!plugin) return null;
	let target: string | null = null;
	plugin.decorations.between(
		pos - LINK_DELIMITER_LENGTH,
		pos + LINK_DELIMITER_LENGTH,
		(from, to, value) => {
			if (value !== linkBody) return;
			if (pos < from - LINK_DELIMITER_LENGTH) return;
			if (pos > to + LINK_DELIMITER_LENGTH) return;
			target = view.state.sliceDoc(from, to).split('|')[0] ?? null;
			return false;
		},
	);
	return target;
}
