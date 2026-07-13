// Object.hasOwn (ES2022) isn't available below Safari 15.4/Chrome 93/Firefox
// 92 - react-markdown calls it directly, so without this an old browser
// throws a TypeError the first time markdown is rendered. Polyfilled by hand
// rather than pulling in a general polyfill library, since this is the only
// gap: everything else the app uses is already covered by the ES2015 target.
if (typeof Object.hasOwn !== "function") {
  Object.defineProperty(Object, "hasOwn", {
    value: (object, property) =>
      Object.prototype.hasOwnProperty.call(object, property),
    configurable: true,
    enumerable: false,
    writable: true,
  });
}
