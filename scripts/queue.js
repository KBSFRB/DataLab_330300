

const queue = (function () {
  const current = [];
  const past = [];
  const listeners = [];

  function callListeners() {
    listeners.forEach((listener) => listener({current, past}));
  }

  function add(request) {
    const id = Math.random().toString(36).substring(2);
    current.push({ id, request, startTime: Date.now() });

    callListeners();
    return id;
  }

  function resolve(id, response) {
    const index = current.findIndex((req) => req.id === id);
    if (index === -1) {
      console.error('Request not found in the queue');
      return;
    }
    const req = current[index];
    current.splice(index, 1);
    past.push({ ...req, ok: response.ok, status: response.status, endTime: Date.now() });

    callListeners();
  }

  function addListener(listener) {
    listeners.push(listener);
  }

  return {
    add,
    resolve,
    addListener,
  };


})();


/*
  Proxy of the fetch function
  fetch works as usual, but every requests are intercepted, added to the queue when made and resolved in the queue when completed
*/
window.fetch = new Proxy(window.fetch, {
  apply(actualFetch, that, args) {

    const queue_id = queue.add(args[0]);

    // Forward function call to the original fetch
    const result = Reflect.apply(actualFetch, that, args);

    // Do whatever you want with the resulting Promise
    result.then((response) => {
      queue.resolve(queue_id, response);
    });

    return result;
  },
});