var connect = require("connect"),
    fs = require("fs"),
    pathLib = require("path"),
    glob = require("glob"),
    async = require("async"),
    _ = require("underscore"),
    Minimizers = require("./minimizers");

var AirDrop = function(name) {
  var package = function(req, res, next) {
    return package.router(req, res, next);
  };

  _.extend(package, {
    packageName: name,
    paths: [],
    minimizer: null,
    shouldPackage: false,
    shouldCache: false,
    explicitlyUseBrowserRequire: false
  });

  _.extend(package, packageMethods);
  
  package.router = package._buildRouter();

  package.include("public/require.js");

  return package;
};

module.exports = AirDrop;

AirDrop.Minimizers = Minimizers;

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
      this.minimizer = AirDrop.Minimizers.Default;
    }
    else if(!boolOrMinimizer) {
      this.minimizer = null;
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

  cache: function(bool) {
    this.shouldCache = (typeof bool === "undefined") ? true : bool;
    return this;
  },

  useBrowserRequire: function(bool) {
    this.explicitlyUseBrowserRequire = (typeof bool === "undefined") ? true : bool;
    return this;
  },

  _shouldUseBrowserRequire: function() {
    if(typeof this.explicitlyUseBrowserRequire !== "undefined") {
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

    function cache(origFunc) {
      var cachedData, responseCacher, cachedHeaders = [];

      responseCacher = function(origRes) {
        return {
          setHeader: function(k,v) { cachedHeaders.push([k,v]); origRes.setHeader(k,v); },
          write: function(data) { cachedData = data; origRes.write(data); },
          end: function(){ origRes.end() }
        };
      };

      return function(req, res) {
        if(!package.shouldCache) { 
          cachedData = null;
          cachedHeaders = [];
          return origFunc(req, res);
        }

        if(cachedData) {
          for(var i=0; i < cachedHeaders.length; i++) {
            var tuple = cachedHeaders[i];
            res.setHeader(tuple[0], tuple[1]);
          }
          res.write(cachedData);
          res.end();
        } else {
          origFunc(req, responseCacher(res));
        }
      }
    }

    return connect.router(function(app) {
      function deliverSource(req, res) {
        return function(err, data) {
          if(err) throw err;
          res.setHeader("Content-Type", "application/javascript");
          res.write(data);
          res.end();
        };
      }

      app.get("/air-drop/" + package.packageName + ".js", cache(function(req, res) {
        package.source(deliverSource(req, res));
      }));
    
      app.get("/air-drop/" + package.packageName + "/include/:filepath", cache(function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/");
        readWrapFile("include", filepath, deliverSource(req, res));
      }));

      app.get("/air-drop/" + package.packageName + "/require/:filepath", cache(function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/");
        readWrapFile("require", filepath, deliverSource(req, res));
      }));
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
    if(this.minimizer) { return this.minimizer(code); }
    return code;
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
