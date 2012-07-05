require.define("spec/fixtures/with-dependencies/g", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    exports.g = function() {
      return console.log("g");
    };
  }).call(module.exports);
});
require.define("spec/fixtures/with-dependencies/f", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    exports.f = function() {
      console.log("f");
    };
  }).call(module.exports);
});
require.define("spec/fixtures/with-dependencies/h", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var f = require("./f");
    exports.h = function() {
      var g = require("./g");
      console.log("h");
    };
  }).call(module.exports);
});

