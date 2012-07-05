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
require.define("spec/fixtures/with-dependencies/i", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    exports.i = function() {
      console.log("i");
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
require.define("spec/fixtures/with-dependencies/j", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var h = require("./h");
    exports.j = function() {
      var i = require("./i");
      console.log("j");
    };
  }).call(module.exports);
});
require.define("spec/fixtures/with-dependencies/k", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var h = require("./h");
    var j = require("./j");
    exports.k = function() {
      var g = require("./g");
      console.log("k", g.g(), h.h(), j.j());
    };
  }).call(module.exports);
});

