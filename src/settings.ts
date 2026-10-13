import { App, PluginSettingTab, Setting } from 'obsidian';
import type ToastcrumbsPlugin from './main';

export interface ToastcrumbsSettings {
	upKeys: string[];
	downKeys: string[];
}

export const DEFAULT_SETTINGS: ToastcrumbsSettings = {
	upKeys: ['up'],
	downKeys: ['down'],
};

function parseKeys(value: string): string[] {
	return value
		.split(',')
		.map((k) => k.trim().toLowerCase())
		.filter((k) => k.length > 0);
}

export class ToastcrumbsSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: ToastcrumbsPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Parent properties')
			.setDesc(
				'Comma-separated frontmatter properties that link to parent notes.',
			)
			.addText((text) =>
				text
					.setPlaceholder('Up')
					.setValue(this.plugin.settings.upKeys.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.upKeys = parseKeys(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Child properties')
			.setDesc(
				'Comma-separated frontmatter properties that link to child notes.',
			)
			.addText((text) =>
				text
					.setPlaceholder('Down')
					.setValue(this.plugin.settings.downKeys.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.downKeys = parseKeys(value);
						await this.plugin.saveSettings();
					}),
			);
	}
}
