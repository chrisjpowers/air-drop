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

var AirDrop = module.exports = function(url) {
  var package = function(req, res, next) {
    return package.router(req, res, next);
  };

  _.extend(package, {
    url: url,
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
  _addPath: function(path, options) {
    var package = this;
    options = options || {};
    options.isCss = package.isCss();
    pathsFromGlob(path, function(err, paths) {
      var newPaths = [];
      paths.forEach(function(filepath) {
        var opts = _.clone(options);
        opts.path = filepath;
        newPaths.push(new Path(opts));
      });
      expandPaths(newPaths, function(err, expandedPaths) {
        if (err) throw err;
        var currentFilePaths = _(package.paths).map(function(p) { return p.path; });
        expandedPaths.forEach(function(p) {
          if (currentFilePaths.indexOf(p.path) == -1) {
            package.paths.push(p);
            currentFilePaths.push(p.path);
          }
        });
      });
    });
  },

  require: function(path, options) {
    options = options || {};
    options.type = "require";
    this._addPath(path, options);
    return this;
  },

  include: function(path, options) {
    options = options || {};
    options.type = "include";
    this._addPath(path, options);
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

  isCss: function() {
    return /\.css$/.test(this.url);
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
    orderedAsync.map(package.allPaths(), _.bind(package._fetchCode, package), function(err, parts) {
      if(err) { return cb(err) }
      package.minimizer(parts.join("\n"), cb);
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
          var contentType;
          if(err) throw err;
          if (package.isCss()) {
            contentType = "text/css";
          } else {
            contentType = "application/javascript";
          }
          res.setHeader("Content-Type", contentType);
          res.write(data);
          res.end();
        };
      }

      app.get(package.url, function(req, res) {
        package.useCachedResult(package.url, _.bind(package.source, package), deliverSource(req, res));
      });
    
      app.get(package.url + "/include/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/"),
            key = package.url + "/include/" + filepath,
            fetchFunc = function(cb) {
              var path = new Path({type: "include", path: filepath, isCss: package.isCss()});
              package.readWrapFile(path, cb);
            };
        package.useCachedResult(key, fetchFunc, deliverSource(req, res));
      });

      //@todo: routing should accept optional module_name param
      //    eg: package.url + "/require/:filepath[/:module_name]" provided by path.name
      app.get(package.url + "/require/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/"),
            key = package.url + "/require/" + filepath,
            fetchFunc = function(cb) {
              var path = new Path({type: "require", path: filepath, isCss: package.isCss()});
              package.readWrapFile(path, cb);
            };
        package.useCachedResult(key, fetchFunc, deliverSource(req, res));
      });
    });
  },

  _fetchCode: function(path, cb) {
    var package = this;
    if(package.shouldPackage) {
      package.readWrapFile(path, cb);
    }
    else {
      encodedPath = path.relativePath.replace(/\//g, "|");
      if (package.isCss()) {
        cb(null, "@import url(\"" + package.url + "/" + path.type + "/" + encodedPath + "\");");
      } else {
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
      if (package.isCss()) {
        cb(null, code);
      } else {
        cb(null, package._stripFunctions(code));
      }
    });
  }
};

function expandPaths(paths, cb) {
  orderedAsync.concat(paths, buildDependentPaths, function(err, deps) {
    if(err) { return cb(err); }
    try {
      var allPaths = deps,
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
}

function buildDependentPaths(path, list, cb) {
  if (!Array.isArray(list)) {
    cb = list;
    list = [path];
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

function pathsFromGlob(path, cb) {
  var filepath = path;
  // add extension wildcard
  if (pathLib.extname(filepath) === "") {
    filepath += ".*"
  }
  glob(filepath, function(err, paths) {
    if (paths.length == 0) {
      cb(err, [path]);
    } else {
      cb(err, paths);
    }
  });
}
