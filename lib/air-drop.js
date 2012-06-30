var pathLib = require("path"),
    glob = require("glob"),
    async = require("async"),
    _ = require("underscore"),
    router = require("./router"),
    orderedAsync = require("./ordered-async"),
    Minimizers = require("./minimizers"),
    Cachers = require("./cachers"),
    Path = require("./path"),
    Compilers = require("./compilers");

var AirDrop = module.exports = function(name) {
  var package = function(req, res, next) {
    return package.router(req, res, next);
  };

  _.extend(package, {
    packageName: name,
    url: "/air-drop/" + name + ".js",
    paths: [],
    functionsToStrip: [],
    minimizer: Minimizers.None,
    shouldPackage: false,
    cacher: null,
    explicitlyUseBrowserRequire: null
  });

  _.extend(package, packageMethods);
  
  package.router = package._buildRouter();

  return package;
};

AirDrop.Minimizers = Minimizers;
AirDrop.Cachers = Cachers;
AirDrop.Compilers = Compilers;
AirDrop.Path = Path;

var packageMethods = {
  at: function(url) {
    this.url = url;
    return this;
  },

  require: function(path, options) {
    options = options || {};
    options.type = "require";
    options.path = path;
    this.paths.push(new Path(options));
    return this;
  },

  include: function(path, options) {
    options = options || {};
    options.type = "include";
    options.path = path;
    this.paths.push(new Path(options));
    return this;
  },

  minimize: function(boolOrMinimizer) {
    if(_.isUndefined(boolOrMinimizer) || boolOrMinimizer === true) {
      this.minimizer = Minimizers.Default;
    }
    else if(!boolOrMinimizer) {
      this.minimizer = Minimizers.None;
    }
    else if(_.isFunction(boolOrMinimizer)) {
      this.minimizer = boolOrMinimizer;
    }
    return this;
  },

  package: function(bool) {
    this.shouldPackage = (typeof bool === "undefined") ? true : bool;
    return this;
  },

  cache: function(boolOrCacher) {
    if(_.isUndefined(boolOrCacher) || boolOrCacher === true) {
      this.cacher = Cachers.Default;
    }
    else if(!boolOrCacher) {
      this.cacher = Cachers.None;
    }
    else if(_.isFunction(boolOrCacher)) {
      this.cacher = boolOrCacher;
    }
    return this;
  },

  stripFunction: function(functionName) {
    this.functionsToStrip.push(functionName);
    return this;
  },

  useCachedResult: function cache(key, fetchFunc, cb) {
    this.cacher ? this.cacher(key, _.bind(fetchFunc, this), cb) : fetchFunc(cb);
  },

  useBrowserRequire: function(bool) {
    this.explicitlyUseBrowserRequire = (typeof bool === "undefined") ? true : bool;
    return this;
  },

  _shouldUseBrowserRequire: function() {
    if(!_.isNull(this.explicitlyUseBrowserRequire)) {
      return this.explicitlyUseBrowserRequire;
    }
    var implicitUse = _(this.paths).any(function(path) {
      return path.type === "require"; 
    });
    return implicitUse;
  },

  source: function(cb) {
    var package = this;
    expandPaths(package.allPaths(), function(err, expandedPaths) {
      if(err) { return cb(err) }
      orderedAsync.map(expandedPaths, _.bind(package._fetchCode, package), function(err, parts) {
        if(err) { return cb(err) }
        package.minimizer(parts.join("\n"), cb);
      });
    });
  },

  allPaths: function() {
    var all = this.paths;
    if(this._shouldUseBrowserRequire()) {
      var browserRequirePath = new Path({
        type: "include", 
        path: __dirname + "/browser-require.js"
      });
      var browserRequireHackPath = new Path({
        type: "include",
        path: __dirname + "/browser-require-hack.js"
      });
      all = [browserRequirePath, browserRequireHackPath].concat(all);
    }
    return all;
  },

  _buildRouter: function() {
    var package = this;

    return router(function(app) {
      function deliverSource(req, res) {
        return function(err, data) {
          if(err) throw err;
          res.setHeader("Content-Type", "application/javascript");
          res.write(data);
          res.end();
        };
      }

      app.get(package.url, function(req, res) {
        package.useCachedResult(package.packageName, _.bind(package.source, package), deliverSource(req, res));
      });
    
      app.get(package.url + "/include/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/"),
            key = package.packageName + "/include/" + filepath,
            fetchFunc = function(cb) {
              var path = new Path({type: "include", path: filepath});
              package.readWrapFile(path, cb);
            };
        package.useCachedResult(key, fetchFunc, deliverSource(req, res));
      });

      app.get(package.url + "/require/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/"),
            key = package.packageName + "/require/" + filepath,
            fetchFunc = function(cb) {
              var path = new Path({type: "require", path: filepath});
              package.readWrapFile(path, cb);
            };
        package.useCachedResult(key, fetchFunc, deliverSource(req, res));
      });
    });
  },

  _fetchCode: function(path, cb) {
    var wrap = this._fetchWrappedFile();
    glob(path.pathForGlob(), function(err, filePaths) {
      if(err) { return cb(err); }
      if(filePaths.length === 0) {
        return cb("No files found in path " + path.path);
      }
      var expandedPaths = _(filePaths || []).map(function(filepath) {
        return path.clone({path: filepath});
      });
      orderedAsync.map(expandedPaths, wrap, function(err, parts) {
        err ? cb(err) : cb(null, parts.join("\n"))
      });
    });
  },

  _fetchWrappedFile: function() {
    var package = this;
    if(package.shouldPackage) {
      return function(path, cb) {
        package.readWrapFile(path, cb);
      };
    }
    else {
      return function(path, cb) {
        encodedPath = path.relativePath.replace(/\//g, "|");
        cb(null, "document.write('<scr'+'ipt src=\"" + package.url + "/" + path.type + "/" + encodedPath + "\" type=\"text/javascript\"></scr'+'ipt>');");
      }
    }
  },

  _applyMinimization: function(code) {
    return this.minimizer(code);
  },

  _stripFunctions: function(code) {
    var nodeName, i,
        burrito = require('burrito'),
        package = this;

    return burrito(code, function (node) {
      if (node.name === 'call') {
        nodeName = node.start.value;
        for(i=0; i < package.functionsToStrip.length; i++) {
          if (nodeName === package.functionsToStrip[i]) {
            node.wrap('');
          }
        }
      }
    });
  },

  readWrapFile: function(path, cb) {
    var package = this, code;
    path.source(function(err, code) {
      if(err) { return cb(err); }
      cb(null, package._stripFunctions(code));
    });
  }
};

function expandPaths(paths, cb) {
  orderedAsync.concat(paths, expandPath, function(err, flattened) {
    if(err) { return cb(err); }
    orderedAsync.concat(flattened, buildDependentPaths, function(err, deps) {
      if(err) { return cb(err); }
      try {
        var allPaths = deps.concat(flattened),
            compacted = [],
            nameIndex = [];
      
        for(var i=0; i < allPaths.length; i++) {
          var path = allPaths[i];
          if(nameIndex.indexOf(path.path) === -1) {
            nameIndex.push(path.path);
            compacted.push(path);
          }
        }
        cb(null, compacted);
      } catch (e) {
        cb(err || e);
      }
    });
  });
}

function expandPath(path, cb) {
  glob(path.pathForGlob(), function(err, filePaths) {
    try {
      if(err) { throw err; }
      var clonedPaths = _(filePaths).map(function(newPath) {
        return path.clone({path: newPath});
      });
      cb(null, clonedPaths);
    }
    catch(e) {
      if(err) { return cb(err); }
    }
  });
}

function buildDependentPaths(path, list, cb) {
  if (!Array.isArray(list)) {
    cb = list;
    list = [];
  }

  var walkDeps = function(depPath, cb) {
    list.unshift(depPath);
    buildDependentPaths(depPath, list, function(err, cb2) {
      cb(err, list);
    });
  };

  path.dependencyPaths(function(err, paths) {
    if (err) return cb(err);
    async.map(paths, walkDeps, function(err) {
      cb(err, list);
    });
  });
}
