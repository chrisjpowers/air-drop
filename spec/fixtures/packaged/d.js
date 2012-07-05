require.define("spec/fixtures/requires/d", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    exports.d = function() {
      console.log("Hello from D!");
      return "D";
    };
  }).call(module.exports);
});
