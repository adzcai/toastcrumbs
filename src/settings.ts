import { App, PluginSettingTab, Setting } from 'obsidian';
import type ToastcrumbsPlugin from './main';
import {
	Periodicity,
	PERIODICITY_PLACEHOLDERS,
	TemplatePaths,
} from './navigate/periodicity';

export interface ToastcrumbsSettings {
	upKeys: string[];
	downKeys: string[];
	/** Properties that each get an "Open <property>" command. */
	commandProperties: string[];
	/** Moment formats for periodic note paths, used by "Open a date note". */
	templatePaths: TemplatePaths;
}

export const DEFAULT_SETTINGS: ToastcrumbsSettings = {
	upKeys: ['up'],
	downKeys: ['down'],
	commandProperties: [],
	templatePaths: {
		day: null,
		week: null,
		month: null,
		quarter: null,
		year: null,
	},
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

		new Setting(containerEl).setName('Hierarchy').setHeading();

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

		new Setting(containerEl).setName('Navigation').setHeading();

		new Setting(containerEl)
			.setName('Property commands')
			.setDesc(
				'Add an "Open <property>" command for each property, one per line.',
			)
			.addTextArea((text) => {
				text
					.setPlaceholder(['Up', 'Down', 'Next', 'Prev'].join('\n'))
					.setValue(this.plugin.settings.commandProperties.join('\n'))
					.onChange(async (value) => {
						const list = value
							.split('\n')
							.map((item) => item.trim())
							.filter((item) => item.length > 0);
						await this.plugin.setCommandProperties(list);
					});
				text.inputEl.rows = 8;
			});

		for (const p of Object.values(Periodicity)) {
			const setting = new Setting(containerEl)
				.setName(`${p.charAt(0).toUpperCase()}${p.slice(1)} note path`)
				.setDesc('Preview: ');
			setting.addMomentFormat((fmt) => {
				fmt.setPlaceholder(PERIODICITY_PLACEHOLDERS[p])
					.setSampleEl(setting.descEl.createEl('strong'))
					.setValue(this.plugin.settings.templatePaths[p] ?? '')
					.onChange(async (value) => {
						this.plugin.settings.templatePaths[p] = value || null;
						await this.plugin.saveData(this.plugin.settings);
					});
			});
		}
	}
}
