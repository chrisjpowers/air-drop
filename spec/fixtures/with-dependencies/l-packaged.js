require.define("node_modules/module-a/lib/more/other-helper", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    exports.otherHelper = "Deep in Module A";
  }).call(module.exports);
});
require.define("node_modules/module-a/lib/helper", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var otherHelper = require("./more/other-helper");
    exports.helper = "Hello, Module A!";
  }).call(module.exports);
});
require.define("node_modules/module-a/index", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var helper = require("./lib/helper");
    exports.moduleA = function() {
      console.log("moduleA");
    };
  }).call(module.exports);
});
require.define("module-a", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    module.exports = require("node_modules/module-a/index");
  }).call(module.exports);
});
require.define("node_modules/module-b/backwards-reference", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    exports.backwards = "Reference";
  }).call(module.exports);
});
require.define("node_modules/module-b/lib/module-b", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var backRef = require("../backwards-reference");
    var moduleA = require("module-a");
    exports.moduleB = function() {
      console.log("Module B");
    };
  }).call(module.exports);
});
require.define("module-b", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    module.exports = require("node_modules/module-b/lib/module-b");
  }).call(module.exports);
});
require.define("node_modules/module-c/main", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var moduleB;
    moduleB = require("module-b");
    exports.moduleC = function() {
      return console.log("Module C");
    };
  }).call(module.exports);
});
require.define("module-c", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    module.exports = require("node_modules/module-c/main");
  }).call(module.exports);
});
require.define("spec/fixtures/with-dependencies/l", function(require, module, exports) {
  (function() {
    require = hackRequire(require);
    var moduleC = require("module-c");
    exports.l = function() {
      console.log("l");
    };
  }).call(module.exports);
});

