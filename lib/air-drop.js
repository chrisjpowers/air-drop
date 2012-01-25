var connect = require("connect"),
    fs = require("fs"),
    pathLib = require("path"),
    glob = require("glob"),
    async = require("async"),
    _ = require("underscore"),
    Minimizers = require("./minimizers"),
    Cachers = require("./cachers");

var AirDrop = function(name) {
  var package = function(req, res, next) {
    return package.router(req, res, next);
  };

  _.extend(package, {
    packageName: name,
    paths: [],
    minimizer: Minimizers.None,
    shouldPackage: false,
    cacher: null,
    explicitlyUseBrowserRequire: null
  });

  _.extend(package, packageMethods);
  
  package.router = package._buildRouter();

  package.include("public/require.js");

  return package;
};

module.exports = AirDrop;

AirDrop.Minimizers = Minimizers;
AirDrop.Cachers = Cachers;

var packageMethods = {
  require: function(path) {
    this.paths.push(["require", path]);
    return this;
  },

  include: function(path) {
    this.paths.push(["include", path]);
    return this
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
    var implicitUse = _(this.paths).any(function(tuple) {
      return tuple[0] === "require"; 
    });
    return implicitUse;
  },

  source: function(cb) {
    var package = this;
    expandPaths(package.allPaths(), function(err, expandedPaths) {
      if(err) { return cb(err) }
      orderedAsyncMap(expandedPaths, _.bind(package._fetchCode, package), function(err, parts) {
        if(err) { return cb(err) }
        cb(null, package._applyMinimization(parts.join("\n")));
      });
    });
  },

  allPaths: function() {
    var all = this.paths;
    if(this._shouldUseBrowserRequire()) {
      all = [["include", __dirname + "/browser-require.js"]].concat(all);
    }
    return all;
  },

  _buildRouter: function() {
    var package = this;

    return connect.router(function(app) {
      function deliverSource(req, res) {
        return function(err, data) {
          if(err) throw err;
          res.setHeader("Content-Type", "application/javascript");
          res.write(data);
          res.end();
        };
      }

      app.get("/air-drop/" + package.packageName + ".js", function(req, res) {
        package.useCachedResult(package.packageName, _.bind(package.source, package), deliverSource(req, res));
      });
    
      app.get("/air-drop/" + package.packageName + "/include/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/"),
            key = package.packageName + "/include/" + filepath,
            fetchFunc = function(cb) {
              readWrapFile("include", filepath, cb);
            };
        package.useCachedResult(key, fetchFunc, deliverSource(req, res));
      });

      app.get("/air-drop/" + package.packageName + "/require/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/"),
            key = package.packageName + "/require/" + filepath,
            fetchFunc = function(cb) {
              readWrapFile("require", filepath, cb);
            };
        package.useCachedResult(key, fetchFunc, deliverSource(req, res));
      });
    });
  },

  _fetchCode: function(tuple, cb) {
    var wrapper = tuple[0], 
        globPath = tuple[1],
        wrap = this._fetchWrappedFile(wrapper);
    glob(globPath, function(err, filePaths) {
      if(err) { return cb(err); }
      orderedAsyncMap(filePaths || [], wrap, function(err, parts) {
        err ? cb(err) : cb(null, parts.join("\n"))
      });
    });
  },

  _fetchWrappedFile: function(wrapper) {
    var package = this;
    if(package.shouldPackage) {
      return function(path, cb) {
        readWrapFile(wrapper, path, cb);
      };
    }
    else {
      return function(path, cb) {
        path = path.replace(/\//g, "|");
        cb(null, "document.write('<scr'+'ipt src=\"/air-drop/" + package.packageName + "/" + wrapper + "/" + path + "\" type=\"text/javascript\"></scr'+'ipt>');");
      }
    }
  },

  _applyMinimization: function(code) {
    return this.minimizer(code);
  }    
};

function moduleName(path) {
  return pathLib.dirname(path) + "/" + pathLib.basename(path, pathLib.extname(path));
}

function readWrapFile(wrapper, path, cb) {
  fs.readFile(path, function(err, data) {
    if(err) { return cb(err); }
    if(/coffee$/.test(path)) { 
      data = require("coffee-script").compile(data.toString(), {bare: true});
    }
    if(wrapper === "require") {
      cb(null, "require.define('" + moduleName(path) + "', function(require, module, exports){\n" + data + "\n});\n");
    }
    else {
      cb(null, data + "\n");
    }
  });
}


function expandPaths(paths, cb) {
  orderedAsyncConcat(paths, expandPath, function(err, allPaths) {
    if(err) { return cb(err); }
    var flattened = allPaths,
        compacted = [],
        nameIndex = [];
    for(var i=0; i < flattened.length; i++) {
      var path = allPaths[i];
      if(nameIndex.indexOf(path[1]) === -1) {
        nameIndex.push(path[1]);
        compacted.push(path);
      }
    }
    cb(null, compacted);
  });
}

function expandPath(tuple, cb) {
  var wrapper = tuple[0], 
      globPath = tuple[1];
  glob(globPath, function(err, filePaths) {
    if(err) { return cb(err); }
    cb(null, _(filePaths).map(function(path) { return [wrapper, path]; }));
  });
}

function orderedAsyncMap(arr, iterator, origCb) {
  var arrWithIndexes = _(arr).map(function(item, i) { return [item, i]; });
  var wrappedIterator = function(tuple, cb) {
    var origItem = tuple[0],
        i = tuple[1];
    iterator(origItem, function(err, result) {
      cb(err, [result, i]);
    });
  };
      
  async.map(arrWithIndexes, wrappedIterator, function(err, tuples) {
    if(err) { return origCb(err); }
    var orderedItems = [];
    _(tuples).each(function(tuple) {
      var item = tuple[0],
          i = tuple[1];
      orderedItems[i] = item;
    });
    origCb(null, orderedItems);
  });
}

function orderedAsyncConcat(arr, iterator, cb) {
  orderedAsyncMap(arr, iterator, function(err, items) {
    if(err) { return cb(err); }
    var head = items.shift();
    for(var i=0; i < items.length; i++) {
      head = head.concat(items[i]);
    }
    cb(null, head);
  });
}
