var compilers = [],
    _ = require("underscore"),
    pathLib = require("path");

var add = exports.add = function(compiler, test) {
  compilers.push([compiler, test]);  
};

exports.choose = function(path) {
  var matchingCompiler = None;
  
  _(compilers).each(function(tuple) {
    var compiler = tuple[0],
        test = tuple[1];
    if(test(path)) { matchingCompiler = compiler; }
  });
  return matchingCompiler;
};

var None = function(data, cb) { cb(null, data) };

var Coffeescript = function(data, cb) {
  try {
    var out = require("coffee-script").compile(data, {bare: true});
    cb(null, out);
  } catch (e) {
    cb(e);
  }
};

var Stylus = function(data, cb, path) {
  var stylus = require("stylus");
  try {
    stylus(data).set("filename", path.path).render(cb);
  } catch (e) {
    cb(e);
  }
};

var Less = function(data, cb, path) {
  try {
    var dir = pathLib.dirname(path.path),
        base = pathLib.basename(path.path),
        less = require("less");

    var parser = new(less.Parser)({
      paths: [dir], // Specify search paths for @import directives
      filename: base // Specify a filename, for better error messages
    });

    parser.parse(data, function (e, tree) {
      if (e) return cb(e);
      var out = tree.toCSS();
      cb(null, out);
    });
  } catch (e) {
    cb(e);
  }
};
    
add(Coffeescript, function(path) {
  return /\.coffee$/.test(path.path);
}); 

add(Stylus, function(path) {
  return /\.styl$/.test(path.path);
});

add(Less, function(path) {
  return /\.less$/.test(path.path);
});
