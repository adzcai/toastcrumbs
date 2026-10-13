import { debounce, Plugin } from 'obsidian';
import { VIEW_TYPE_HIERARCHY } from './constants';
import { HierarchyIndex } from './graph/hierarchy-index';
import {
	DEFAULT_SETTINGS,
	ToastcrumbsSettings,
	ToastcrumbsSettingTab,
} from './settings';
import { HierarchyView } from './ui/hierarchy-view';

export default class ToastcrumbsPlugin extends Plugin {
	settings!: ToastcrumbsSettings;
	index!: HierarchyIndex;

	private readonly rebuildIndex = debounce(
		() => {
			this.index.setKeys(this.settings.upKeys, this.settings.downKeys);
			this.index.rebuild();
		},
		500,
		true,
	);

	async onload() {
		await this.loadSettings();

		this.index = new HierarchyIndex(this.app);
		this.index.setKeys(this.settings.upKeys, this.settings.downKeys);

		this.registerView(
			VIEW_TYPE_HIERARCHY,
			(leaf) => new HierarchyView(leaf, this.index),
		);
		this.registerHoverLinkSource(VIEW_TYPE_HIERARCHY, {
			display: 'Toastcrumbs',
			defaultMod: true,
		});

		this.addRibbonIcon('git-fork', 'Open hierarchy view', () => {
			void this.activateView();
		});
		this.addCommand({
			id: 'open-hierarchy-view',
			name: 'Open hierarchy view',
			callback: () => {
				void this.activateView();
			},
		});
		this.addSettingTab(new ToastcrumbsSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.index.rebuild();
			const { vault, metadataCache } = this.app;
			this.registerEvent(
				metadataCache.on('changed', (file) =>
					this.index.onMetadataChanged(file),
				),
			);
			this.registerEvent(vault.on('create', (f) => this.index.onCreate(f)));
			this.registerEvent(vault.on('delete', (f) => this.index.onDelete(f)));
			this.registerEvent(
				vault.on('rename', (f, oldPath) => this.index.onRename(f, oldPath)),
			);
		});
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_HIERARCHY)[0];
		if (!leaf) {
			const right = workspace.getRightLeaf(false);
			if (!right) return;
			await right.setViewState({ type: VIEW_TYPE_HIERARCHY, active: true });
			leaf = right;
		}
		await workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ToastcrumbsSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.rebuildIndex();
	}
}
