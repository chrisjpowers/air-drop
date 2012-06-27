require.define("spec/fixtures/with-dependencies/g", function(require, module, exports) {
  require = hackRequire(require);
  exports.g = function() {
    return console.log("g");
  };
});
require.define("spec/fixtures/with-dependencies/f", function(require, module, exports) {
  require = hackRequire(require);
  exports.f = function() {
    console.log("f");
  };
});
require.define("spec/fixtures/with-dependencies/h", function(require, module, exports) {
  require = hackRequire(require);
  var f = require("./f");
  exports.h = function() {
    var g = require("./g");
    console.log("h");
  };
});

