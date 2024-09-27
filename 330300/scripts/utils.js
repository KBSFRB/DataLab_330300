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

function make_color_scale_legend(color_scale, min, max, text_format) {
	grades = Array.from({length: colors_scheme.length+1}, (_, i) => i / colors_scheme.length);
				

	let legend_html = '<div class="flex w-full h-3">'
    for (let i = 0; i < grades.length-1; i++) {
        legend_html +=
            `<div class="flex-1" style="background:${get_color(colors_scheme, (grades[i] + grades[i+1])/2)}"></div> `;
    }
    legend_html += '</div><div class="w-full h-3 relative">'
    for (let i = 0; i < grades.length; i++) {
    	const percent = grades[i]*100;
    	const value = min + (max - min) * grades[i];
        legend_html +=
            `<span class="absolute w-4 -ml-2 text-center" style="left:${percent}%">${text_format(value)}</span>`;
    }
    legend_html += '</div>';

    console.log(legend_html);

    return legend_html;
}

function color_is_light(hex) {
  const bigint = parseInt(hex.substring(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? true : false;
}