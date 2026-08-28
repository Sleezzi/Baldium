function formatFileSize(bytes: number, decimals = 2): string {
	if (bytes === 0) return "0 o";

	const k = 1024;
	const units = ["o", "Ko", "Mo", "Go", "To", "Po"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	const value = bytes / Math.pow(k, i);
	const formatted = value.toFixed(decimals).replace(/\.?0+$/, "");

	return `${formatted} ${units[i]}`;
}

export default formatFileSize;