export function readableDate(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;

	const formatted = new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(d);

	return formatted;
}

export function readableTime(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;

	const formatted = new Intl.DateTimeFormat("fr-FR", {
		hour: "2-digit",
		minute: "numeric",
	}).format(d);

	return formatted;
}