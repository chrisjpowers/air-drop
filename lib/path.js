var pathLib = require("path"),
    glob = require("glob"),
    Compilers = require("./compilers"),
    _ = require("underscore"),
    fs = require("fs"),
    orderedAsync = require("./ordered-async"),
    detective = require("detective");

var Path = module.exports = function Path(options) {
  this.type = options.type;
  this.path = options.path;
  this.name = options.name;
  this.explicitCompiler = options.compiler;

  // relative/absolute paths
  if (/^[\.\/]/.test(this.path)) {
    this.path = pathLib.resolve(this.path);
  }
  // node modules
  else {
    var dir = pathLib.join(process.cwd(), "node_modules", this.path);
    var packagePath = pathLib.join(dir, "package.json");
    var package;
    if (pathLib.existsSync(packagePath)) {
      package = JSON.parse(fs.readFileSync(packagePath));
    } else {
      package = {};
    }
    var main = package.main || "./index";
    this.path = withAutoSuffix(pathLib.join(dir, main));
  }
  this.relativePath = pathLib.relative(process.cwd(), this.path);

  this.options = options;
};

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
    var path = this;
    this.unwrappedSource(function(err, code) {
      var deps;
      if (err) return cb(err);
      try {
        deps = detective(code);
      }
      catch (e) {
        console.log("Failed to parse dependencies for " + path.path);
        console.log(code);
        throw e;
      }
      cb(null, deps);
    });
  },

  dependencyPaths: function(cb) {
    var path = this;
    this.dependencies(function(err, deps) {
      if (err) return cb(err);

      var getFullPath = function(dep, cb2) {
        var dir = pathLib.dirname(path.path);
        if (/^\./.test(dep)) {
          var pathWithoutSuffix = pathLib.join(dir, dep);
        } else {
          var pathWithoutSuffix = dep;
        }
        try {
          var depPath = new Path({type: "require", path: pathWithoutSuffix});
        } catch (e) {
          return cb2("Path Not Found: " + pathWithoutSuffix);
        }
        cb2(null, depPath);
      };

      orderedAsync.map(deps, getFullPath, cb);
    });
  },

  source: function(cb) {
    var path = this;
    this.unwrappedSource(function(err, code) {
      if (err) return cb(err);
      if(path.type === "require") {
        cb(null, path.wrapAsModule(code));
      }
      else {
        cb(null, code + "\n");
      }
    });
  },

  unwrappedSource: function(cb) {
    var path = this;
    fs.readFile(withAutoSuffix(path.path), function(err, data) {
      if(err) { return cb(err); }
      var compiler = path.compiler();
      compiler(data.toString(), cb);
    });
  },

  wrapAsModule: function(code) {
    var out = "require.define('" + this.moduleName() + "', function(require, module, exports) {\nrequire=hackRequire(require);\n" + code + "\n});\n";
    if (this.isNodeModule) {
      var shortName = this.moduleName().match(/node_modules\/([^\/]+)/)[1];
      out += "require.define('" + shortName + "', function(require, module, exports) {\nrequire=hackRequire(require);\nmodule.exports = require('" + this.moduleName() + "');\n});\n";
    }
    return out;
  },

  pathForGlob: function() {
    if (pathLib.extname(this.path) === "") {
      return this.path + ".*";
    } else {
      return this.path;
    }
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

function withAutoSuffix(path) {
  if (pathLib.existsSync(path)) {
    return path;
  } else if (pathLib.existsSync(path + ".js")) {
    return path + ".js"
  } else {
    var dir = pathLib.dirname(path);
    var filenames = fs.readdirSync(dir);
    var basename = pathLib.basename(path);
    var filename = _(filenames).detect(function(name) {
      return pathLib.basename(name, pathLib.extname(name)) === basename;
    });
    if (!filename) {
      throw "Path Not Found: " + path;
    }
    return pathLib.join(dir, filename);
  }
}
