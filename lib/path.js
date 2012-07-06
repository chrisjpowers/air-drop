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
  this.isCss = options.isCss;
  this.explicitCompiler = options.compiler;

  // relative/absolute paths
  if (/^([\.\/]|node_modules)/.test(this.path)) {
    this.path = withAutoSuffix(pathLib.resolve(this.path));
    this.relativePath = "./" + pathLib.relative(process.cwd(), this.path);
  }
  // node modules or relative path
  else {
    try {
      // will throw if file is not found, meaning it's a module
      this.path = withAutoSuffix("./" + this.path);
      this.relativePath = "./" + pathLib.relative(process.cwd(), this.path);
    }
    catch (e) {
      this.isNodeModule = true;
      this.relativePath = this.path;
    }
  }
};

Path.prototype = {
  moduleName: function() {
    return implicitModuleName(this.relativePath);
  },

  compiler: function() {
    return this.explicitCompiler || Compilers.choose(this);
  },

  dependencies: function(cb) {
    if (this.isCss) {
      this.cssDependencies(cb);
    } else {
      this.jsDependencies(cb);
    }
  },

  cssDependencies: function(cb) {
    var path = this;
    this.unwrappedSource(function(err, code) {
      if (err) return cb(err);
      var m,
          deps = [],
          lines = code.split(/\n|\r/);
      while (m = lines.shift().match(/^@import url\("(.*)"\)/)) {
        var dir = pathLib.dirname(path.path);
        deps.push(m[1]);
      }
      cb(null, deps);
    });
  },

  jsDependencies: function(cb) {
    var path = this;
    this.unwrappedSource(function(err, code) {
      var deps;
      if (err) return cb(err);
      try {
        deps = detective(code);
      }
      catch (e) {
        cb(e);
      }
      cb(null, deps);
    });
  },

  dependencyPaths: function(cb) {
    var path = this;
    this.dependencies(function(err, deps) {
      if (err) return cb(err);

      var getFullPath = function(dep, cb2) {
        var depPath;
        var dir = pathLib.dirname(path.path);
        if (path.isCss || /^\./.test(dep)) {
          var pathWithoutSuffix = pathLib.join(dir, dep);
        } else {
          var pathWithoutSuffix = dep;
        }
        try {
          if (path.isCss) {
            depPath = new Path({type: "include", path: pathWithoutSuffix, isCss: true});
          } else {
            depPath = new Path({type: "require", path: pathWithoutSuffix});
          }
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
      if (path.isCss) {
        cb(null, path.wrapAsCss(code));
      } else if(path.type === "require") {
        cb(null, path.wrapAsModule(code));
      }
      else {
        cb(null, code + "\n");
      }
    });
  },

  unwrappedSource: function(cb) {
    var path = this;
    if (this.isNodeModule) {
      var dir = pathLib.join(process.cwd(), "node_modules", this.path);
      var packagePath = pathLib.join(dir, "package.json");
      var package;
      if (pathLib.existsSync(packagePath)) {
        package = JSON.parse(fs.readFileSync(packagePath));
      } else {
        package = {};
      }
      var main = package.main || "./index";
      var fullDepPath = pathLib.join(dir, main);
      var depPath = pathLib.relative(process.cwd(), fullDepPath);
      depPath = depPath.replace(/\.\w+$/, "");

      var out = "module.exports = require('" + depPath + "');";
      cb(null, out);
    }
    else {
      fs.readFile(withAutoSuffix(path.path), function(err, data) {
        if(err) { return cb(err); }
        var compiler = path.compiler();
        compiler(data.toString(), cb, path);
      });
    }
  },

  wrapAsCss: function(code) {
    var lines = code.split(/\n|\r/);
    var nonImportLines = _(lines).reject(function(line) { return /^@import/.test(line); });
    return nonImportLines.join("\n");
  },

  wrapAsModule: function(code) {
    var out = "require.define('" + this.moduleName() + "', function(require, module, exports) {\n(function() {\nrequire=hackRequire(require);\n" + code + "\n}).call(module.exports)});\n";
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
  return out.replace(/^\.\//, "");
}

function withAutoSuffix(path) {
  if (pathLib.existsSync(path)) {
    return path;
  } else if (pathLib.existsSync(path + ".js")) {
    return path + ".js";
  } else if (pathLib.existsSync(path + ".css")) {
    return path + ".css";
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
