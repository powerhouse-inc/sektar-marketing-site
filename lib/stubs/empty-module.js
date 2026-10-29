// Inert stand-in for optional packages a dependency imports lazily but this app
// never calls (see next.config.ts). A Proxy keeps every access inert: property
// reads return the stub, calls and `new` return empty values, so named imports
// resolve without the real package.
const stub = new Proxy(function stub() {}, {
  get: () => stub,
  apply: () => undefined,
  construct: () => ({}),
});

module.exports = stub;
