/**
 * Return a color from the color scheme, based on the given value
 * @param {Array[string]} scheme: array of colors
 * @param {number} value: value between 0 and 1
 * the range 0-1 is split in n classes of equal size, where n is the length of the color scheme
 */
function get_color(scheme, value) {
	let color_id = clamp(Math.floor(value * scheme.length), 0, scheme.length - 1);
	return scheme[color_id];
}


const format_percent = new Intl.NumberFormat(navigator.language, {style: 'percent', maximumSignificantDigits: 3}).format;
const format_score = new Intl.NumberFormat(navigator.language, {maximumSignificantDigits: 3}).format;