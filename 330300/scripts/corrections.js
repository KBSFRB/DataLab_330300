const correction_module = function() {
  let initialised = false;
  let session_id = '';
  try {
    session_id = self.crypto.randomUUID();
  } catch (e) {
    session_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  let selected_building_id = null;
  
  // Put building in view when working on the form
  let selected_building_location = null;
  

  function getData() {
    let r3 = document.getElementById('rule3-correction').checked;
    let r300 = document.getElementById('rule300-correction').checked;
    return {
      session_id: session_id,
      building_id: selected_building_id,
      lat: selected_building_location.lat,
      lng: selected_building_location.lng,
      r3: r3,
      r30: null,
      r300: r300
    };
  }

  function set_button_state(state) {
    const button = document.getElementById('correction-submit');
    if (state == 'ready') {
      button.disabled = false;
      button.innerHTML = i18n.span({
        'fr': 'Envoyer les corrections',
        'en': 'Send corrections',
        'nl': 'Verbeteringen opsturen'
      });
      button.classList.remove('bg-green-600');
      button.classList.remove('bg-red-600');
      button.classList.remove('bg-slate-500');
      button.classList.add('bg-blue-700');
    } else if (state == 'loading') {
      button.disabled = true;
      button.innerHTML = `<svg fill="#fff" class="inline-block" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <style>.spinner_qM83{animation:spinner_8HQG 1.05s infinite}.spinner_oXPr{animation-delay:.1s}.spinner_ZTLf{animation-delay:.2s}@keyframes spinner_8HQG{0%,57.14%{animation-timing-function:cubic-bezier(0.33,.66,.66,1);transform:translate(0)}28.57%{animation-timing-function:cubic-bezier(0.33,0,.66,.33);transform:translateY(-6px)}100%{transform:translate(0)}}
      </style><circle class="spinner_qM83" cx="4" cy="12" r="3"/><circle class="spinner_qM83 spinner_oXPr" cx="12" cy="12" r="3"/>
      <circle class="spinner_qM83 spinner_ZTLf" cx="20" cy="12" r="3"/></svg>
      ${i18n.span({
        'fr': 'Envoi en cours...',
        'en': 'Sending...',
        'nl': 'Verzenden...'
      })}`;
      button.classList.remove('bg-green-600');
      button.classList.remove('bg-red-600');
      button.classList.add('bg-slate-500');
      button.classList.remove('bg-blue-700');
    } else if (state == 'success') {
      button.disabled = true;
      button.innerHTML = i18n.span({
        'fr': 'Envoyé!',
        'en': 'Sent!',
        'nl': 'Success!'
      });
      button.classList.add('bg-green-600');
      button.classList.remove('bg-red-600');
      button.classList.remove('bg-slate-500');
      button.classList.remove('bg-blue-700');
    } else if (state == 'error') {
      button.disabled = false;
      button.innerHTML = 'Error, try again';
      button.classList.remove('bg-green-600');
      button.classList.add('bg-red-600');
      button.classList.remove('bg-slate-500');
      button.classList.remove('bg-blue-700');
    }
  }

  function submit(data) {
    console.log('submitting');
    console.log(data);

    set_button_state('loading');

    let url = 'https://backend-330300.vandendriesche-c.workers.dev/add_correction';

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to submit corrections -> status: ${response.status}`,
        );
      }
      return response.json();
    })
    .then(data => {
      console.log('Success:', data);
      set_button_state('success');
    })
    .catch((error) => {
      console.error('Error:', error);
      set_button_state('error');
    });

  }

  // Event listeners must be added after the page is loaded
  // initialise is called the first time show is called, to ensure that the DOM is properly loaded
  function initialise() {
    document.getElementById('correction-module').addEventListener('click', function(e) { 
      if (selected_building_location !== null) {
        map.flyTo(selected_building_location);
      }
    });

    // if we click outside the form, close it
    document.addEventListener('click', function(e) {
      if (!document.getElementById('correction-module').contains(e.target)) {
        document.getElementById('correction-form').classList.add('hidden');
      }
    });

    // Listen to submit event
    document.getElementById('correction-form').addEventListener('submit', function(e) {
      e.preventDefault();
      if (selected_building_id !== null) {
        const data = getData();
        submit(data);
      }
    });
  }



  function show(building_properties, building_location) {

    if (!initialised) {
      initialise();
      initialised = true;
    }

    document.getElementById('correction-form').classList.add('hidden');
    document.getElementById('correction-module').classList.remove('hidden');

    document.getElementById('rule3-correction').checked = building_properties.r3 === 1 ? true : false;
    document.getElementById('rule300-correction').checked = building_properties.r300 === 1 ? true : false;

    selected_building_id = building_properties.id;
    selected_building_location = building_location;

    set_button_state('ready');

    console.log(`Starting correction for ${building_properties}`);
  }

  function hide() {
    document.getElementById('correction-module').classList.add('hidden');
  }

  return {
    show, hide, session_id
  }
}();
