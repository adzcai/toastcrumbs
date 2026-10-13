export enum Periodicity {
	DAY = 'day',
	WEEK = 'week',
	MONTH = 'month',
	QUARTER = 'quarter',
	YEAR = 'year',
}

export type TemplatePaths = { [key in Periodicity]: string | null };

export const PERIODICITY_PLACEHOLDERS: { [key in Periodicity]: string } = {
	day: 'YYYY-MM-DD',
	week: 'gggg [W]ww',
	month: 'YYYY-MM MMMM',
	quarter: 'YYYY [Q]Q',
	year: 'YYYY',
};
