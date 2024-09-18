

const i18n = function () {

	const i18n = {};

  i18n.lang = navigator.language;

  /**
   * given a language string, returns the closest option from the options list
   * eg: match_lang('fr-BE', ['en', 'fr', 'nl']) -> 'fr'
   * if no match is found, return the first option
   */
  function match_lang(lang, options) {
    for (let o of options) {
      if (lang.startsWith(o)) {
        return o;
      }
    }

    console.log(`Failed to match ${lang} to ${options} -> return first option (${options[0]}) as default`)
    return options[0];
  }

  /**
   * Remove the i18n-picker-active from every i18n-picker-* element 
   * set the i18n-picker-active to the i18n-picker-[lang] element
   * hide element whose lang attribute is not lang
   */
  function set_lang(lang) {
    i18n.lang = lang;

    document.querySelectorAll("[id^='i18n-picker-']").forEach(el => el.classList.remove('active'));
    document.getElementById(`i18n-picker-${lang}`).classList.add('active');

    document.querySelectorAll(`body *[lang]`).forEach(el => {el.style.display = 'none'});
    document.querySelectorAll(`[lang='${lang}']`).forEach(el => el.style.display = '');
  }

	/**
	 * initialise the language picking options
   * 
   * it expects to find for each language an element with the id "i18n-picker-[lang]"
   * the currently active language is given the class "i18n-picker-active"
   * 
   * elements with the class "i18n-[lang]" will only be shown when lang is the selected language
   * 
   * it will add event listener to detect when language is changed.
	 * it will also set the current language the the browser lang
	 */ 
	i18n.start = function(languages) {
    // set lang based on navigator preferences
    i18n.options = languages;

    set_lang(match_lang(navigator.language, languages));

    // add event listeners
    for (let lang of languages) {
      document.getElementById(`i18n-picker-${lang}`).addEventListener('click', () => {
        set_lang(lang);
      })
    }

	}

  /**
   * Gets a dict of {lang: text}, 
   * returns a string of <span lang="lang">text</span>...
   */
  i18n.span = function(texts) {
    let html = '';
    for (let lang in texts) {
      if (lang == i18n.lang) {
        html += `<span lang="${lang}">${texts[lang]}</span>`
      } else {
        html += `<span lang="${lang}" style="display: none">${texts[lang]}</span>`
      }
    }
    return html;
  }


	return i18n;

}()
