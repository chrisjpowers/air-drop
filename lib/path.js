var pathLib = require("path"),
    Compilers = require("./compilers"),
    _ = require("underscore");

function Path(options) {
  this.type = options.type;
  this.path = options.path;
  this.name = options.name;
  this.explicitCompiler = options.compiler;
  if(options.root) {
    this.root = pathLib.resolve(options.root);
    if(this.path === pathLib.resolve(this.path)) {
      this.relativePath = pathLib.relative(this.root, this.path);
    }
    else {
      this.relativePath = this.path;
      this.path = pathLib.join(this.root, this.relativePath);
    }
  }
  else {
    this.path = pathLib.resolve(this.path);
    this.relativePath = pathLib.relative(this.root, this.path);
  }
  this.fetchPath = pathLib.relative(process.cwd(), this.path);
  this.options = options;
};
module.exports = Path;

Path.prototype = {
  moduleName: function() {
    return this.name || implicitModuleName(this.relativePath);
  },

  compiler: function() {
    return this.explicitCompiler || Compilers.choose(this);
  },

  clone: function(opts) {
    var newOpts = {};
    _.extend(newOpts, this.options);
    _.extend(newOpts, opts);
    return new Path(newOpts);
  }
};

function implicitModuleName(path) {
  var out = "",
      dirname = pathLib.dirname(path);
  if(dirname !== ".") {
    out = dirname + "/";
  }
  out = out + pathLib.basename(path, pathLib.extname(path));
  return out;
}
