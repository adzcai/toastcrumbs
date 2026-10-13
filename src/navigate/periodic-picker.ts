import * as chrono from 'chrono-node';
import { moment, SuggestModal } from 'obsidian';
import type ToastcrumbsPlugin from '../main';
import { Periodicity } from './periodicity';

/** Type a date in natural language ("next friday") to open its periodic notes. */
export class PeriodicPicker extends SuggestModal<string> {
	private readonly initialDate: Date;

	constructor(private readonly plugin: ToastcrumbsPlugin) {
		super(plugin.app);

		// Parse relative dates from the active periodic note, if there is one.
		const path = this.app.workspace.getActiveFile()?.path;
		const dateFromFilename = path
			? Object.values(Periodicity)
					.map((p) => {
						const template = this.getTemplate(p);
						return template
							? moment(path, template + '[.md]', true)
							: null;
					})
					.find((m) => m?.isValid())
			: undefined;
		this.initialDate = dateFromFilename?.toDate() ?? new Date();
	}

	private getTemplate(p: Periodicity): string | null {
		return this.plugin.settings.templatePaths[p];
	}

	getSuggestions(query: string): string[] {
		const date = chrono.parseDate(query, this.initialDate);
		if (!date) return [];
		return Object.values(Periodicity).flatMap((p) => {
			const template = this.getTemplate(p);
			return template ? [moment(date).format(template)] : [];
		});
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	onChooseSuggestion(item: string): void {
		void this.app.workspace.openLinkText(item, '');
	}
}
