import type { EditorView } from '@codemirror/view';
import { Notice, TFile } from 'obsidian';
import type ToastcrumbsPlugin from '../main';
import { frontmatterLinkAt } from './frontmatter-link-extension';
import { LinkSelectionModal } from './link-selection-modal';
import { PeriodicPicker } from './periodic-picker';

const propertyCommandId = (property: string) => `open-property-${property}`;

/** Whether frontmatter link key `linkKey` (e.g. `up.0`) belongs to `property`. */
function linkMatchesProperty(property: string, linkKey: string): boolean {
	if (linkKey === property) return true;
	const i = linkKey.lastIndexOf('.');
	return (
		i > -1 &&
		linkKey.slice(0, i) === property &&
		/^\d+$/.test(linkKey.slice(i + 1))
	);
}

/** Pick one of a note's frontmatter links (optionally of one property) and open it. */
export function openPropertyLink(
	plugin: ToastcrumbsPlugin,
	file: TFile,
	property?: string,
) {
	const all = plugin.app.metadataCache.getFileCache(file)?.frontmatterLinks;
	const links = property
		? all?.filter((link) => linkMatchesProperty(property, link.key))
		: all;
	if (links && links.length > 0) {
		new LinkSelectionModal(plugin.app, file.path, links, !property).open();
	} else {
		new Notice(property ? `No "${property}" link found` : 'No links found');
	}
}

export function registerNavigateCommands(plugin: ToastcrumbsPlugin) {
	const { app } = plugin;

	plugin.addCommand({
		id: 'open-a-property-link',
		name: 'Open a property link',
		checkCallback: (checking) => {
			const file = app.workspace.getActiveFile();
			if (!file) return false;
			if (!checking) openPropertyLink(plugin, file);
			return true;
		},
	});

	plugin.addCommand({
		id: 'open-a-date-note',
		name: 'Open a date note',
		callback: () => new PeriodicPicker(plugin).open(),
	});

	plugin.addCommand({
		id: 'open-zotero',
		name: 'Open this file in Zotero',
		checkCallback: (checking) => {
			const file = app.workspace.getActiveFile();
			if (!file) return false;
			if (!checking) {
				window.open(
					`zotero://select/items/@${encodeURIComponent(file.basename)}`,
				);
			}
			return true;
		},
	});

	plugin.addCommand({
		id: 'follow-internal-link',
		name: 'Follow frontmatter link under cursor',
		editorCheckCallback: (checking, editor, ctx) => {
			// Obsidian's Editor wraps a CodeMirror view, exposed as `cm`.
			const view = (editor as unknown as { cm?: EditorView }).cm;
			if (!view) return false;
			const linktext = frontmatterLinkAt(
				view,
				editor.posToOffset(editor.getCursor()),
			);
			if (!linktext) return false;
			if (!checking) {
				void app.workspace.openLinkText(linktext, ctx.file?.path ?? '');
			}
			return true;
		},
	});

	addPropertyCommands(plugin, plugin.settings.commandProperties);
}

export function addPropertyCommands(
	plugin: ToastcrumbsPlugin,
	properties: string[],
) {
	for (const property of new Set(properties)) {
		plugin.addCommand({
			id: propertyCommandId(property),
			name: `Open ${property}`,
			checkCallback: (checking) => {
				const file = plugin.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) openPropertyLink(plugin, file, property);
				return true;
			},
		});
	}
}

export function removePropertyCommands(
	plugin: ToastcrumbsPlugin,
	properties: string[],
) {
	for (const property of properties) {
		plugin.removeCommand(propertyCommandId(property));
	}
}
