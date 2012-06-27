var pathLib = require("path"),
    Compilers = require("./compilers"),
    _ = require("underscore"),
    fs = require("fs"),
    orderedAsync = require("./ordered-async"),
    detective = require("detective");

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
}
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
  },

  dependencies: function(cb) {
    this.source(function(err, code) {
      if (err) return cb(err);
      var deps = detective(code);
      cb(null, deps);
    });
  },

  dependencyPaths: function(cb) {
    var path = this;
    this.dependencies(function(err, deps) {
      if (err) return cb(err);
      var getFullPath = function(dep, cb2) {
        var dir = pathLib.dirname(path.path);
        var pathWithoutSuffix = pathLib.join(dir, dep);
        var testPath = pathWithoutSuffix + ".js";
        pathLib.exists(testPath, function(exists) {
          if (exists) { cb2(null, testPath); }
          else {
            var depDir = pathLib.dirname(pathWithoutSuffix);
            var basename = pathLib.basename(pathWithoutSuffix);
            fs.readdir(depDir, function(err, filenames) {
              var filename = _(filenames).detect(function(name) {
                return pathLib.basename(name, pathLib.extname(name)) === basename;
              });
              if (filename) {
                cb2(null, pathLib.join(depDir, filename));
              }
              else { cb2("Path Not Found: " + pathWithoutSuffix) }
            });
          }
        });
      };
      orderedAsync.map(deps, getFullPath, function(err, paths) {
        cb(err, paths);
      });
    });
  },

  source: function(cb) {
    var path = this;
    fs.readFile(path.path, function(err, data) {
      if(err) { return cb(err); }
      var compiler = path.compiler();
      compiler(data.toString(), function(err, compiledData) {
        if(err) { return cb(err); }
        if(path.type === "require") {
          code = path.wrapAsModule(compiledData);
        }
        else {
          code = compiledData + "\n";
        }
        cb(null, code);
      });
    });
  },

  wrapAsModule: function(code) {
    return "require.define('" + this.moduleName() + "', function(require, module, exports) {\nrequire=hackRequire(require);\n" + code + "\n});\n";
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
