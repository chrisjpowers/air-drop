require.define("spec/fixtures/requires/d", function(require, module, exports) {
require = hackRequire(require);
exports.d = function() {
  console.log("Hello from D!");
  return "D";
};

});

require.define("spec/fixtures/requires/e", function(require, module, exports) {
require = hackRequire(require);
exports.e = function() {
  console.log("Hello from E!");
  return "E";
};

});
