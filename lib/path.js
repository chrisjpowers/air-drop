var pathLib = require("path"),
    Compilers = require("./compilers");

function Path(options) {
  this.type = options.type;
  this.path = options.path;
  this.name = options.name;
  this.explicitCompiler = options.compiler;
};
module.exports = Path;

Path.prototype = {
  moduleName: function() {
    if(this.name) { return this.name; }
    return pathLib.dirname(this.path) + "/" + pathLib.basename(this.path, pathLib.extname(this.path));
  },

  compiler: function() {
    return this.explicitCompiler || Compilers.choose(this);
  }
};
