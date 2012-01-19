var connect = require("connect"),
    fs = require("fs"),
    pathLib = require("path"),
    glob = require("glob"),
    async = require("async"),
    _ = require("underscore");

module.exports = function(name) {
  var package = function(req, res, next) {
    return package.router(req, res, next);
  };

  _.extend(package, {
    packageName: name,
    paths: [],
    shouldMinimize: false,
    shouldPackage: false
  });

  _.extend(package, packageMethods);
  
  package.router = package.buildRouter();

  package.include("public/require.js");

  return package;
};

var packageMethods = {
  require: function(path) {
    this.paths.push(["require", path]);
    return this;
  },

  include: function(path) {
    this.paths.push(["include", path]);
    return this
  },

  minimize: function(bool) {
    this.shouldMinimize = (typeof bool === "undefined") ? true : bool;
    return this;
  },

  package: function(bool) {
    this.shouldPackage = (typeof bool === "undefined") ? true : bool;
    return this;
  },

  buildRouter: function() {
    var package = this;
    console.log(package);
    return connect.router(function(app) {
      app.get("/air-drop/" + package.packageName + ".js", function(req, res) {
        expandPaths(package.paths, function(err, expandedPaths) {
          if(err) { throw err }
          async.map(expandedPaths, _.bind(package.fetchCode, package), function(err, parts) {
            res.setHeader("Content-Type", "application/javascript");
            res.write(package.minimize(parts.join("\n")));
            res.end();
          });
        });
      });
      app.get("/air-drop/" + package.packageName + "/include/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/");
        readWrapFile("include", filepath, function(err, parts) {
          res.setHeader("Content-Type", "application/javascript");
          res.write(parts);
          res.end();
        });
      });
      app.get("/air-drop/" + package.packageName + "/require/:filepath", function(req, res) {
        var filepath = req.params.filepath.replace(/\|/g, "/");
        readWrapFile("require", filepath, function(err, parts) {
          res.setHeader("Content-Type", "application/javascript");
          res.write(parts);
          res.end();
        });
      });
    });
  },

  fetchCode: function(tuple, cb) {
    var wrapper = tuple[0], 
        globPath = tuple[1],
        wrap = this.fetchWrappedFile(wrapper);
    glob(globPath, function(err, filePaths) {
      if(err) { return cb(err); }
      async.map(filePaths || [], wrap, function(err, parts) {
        err ? cb(err) : cb(null, parts.join("\n"))
      });
    });
  },

  fetchWrappedFile: function(wrapper) {
    var package = this;
    if(package.shouldPackage) {
      return function(path, cb) {
        readWrapFile(wrapper, path, cb);
      };
    }
    else {
      return function(path, cb) {
        path = path.replace(/\//g, "|");
        cb(null, "document.write('<scr'+'ipt src=\"/air-drop/" + package.packageName + "/" + wrapper + "/" + path + "\" type=\"text/javascript\"></scr'+'ipt>');\n");
      }
    }
  },

  minimize: function(code) {
    if(!this.shouldMinimize) { return code; }

    var jsp = require("uglify-js").parser;
    var pro = require("uglify-js").uglify;

    var ast = jsp.parse(code); // parse code and get the initial AST
    ast = pro.ast_mangle(ast); // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    return pro.gen_code(ast); // compressed code here
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
      cb(null, "// " + wrapper + " " + path + "\nrequire.define('" + moduleName(path) + "', function(require, module, exports){\n" + data + "\n});\n");
    }
    else {
      cb(null, "// " + wrapper + " " + path + "\n" + data + "\n");
    }
  });
}


function expandPaths(paths, cb) {
  async.concat(paths, expandPath, function(err, allPaths) {
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

