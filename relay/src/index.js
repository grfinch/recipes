// Worker entry point. Only the default export lives here: the Workers runtime treats every
// named export of this file as an entry point and fails to start on anything else (such as a
// constant). The logic, and everything the tests import, is in relay.js.
import { handle } from './relay.js';

export default {
  fetch: (request, env) => handle(request, env),
};
