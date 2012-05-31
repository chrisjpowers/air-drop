var compilers = [],
    _ = require("underscore");

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
  var out = require("coffee-script").compile(data, {bare: true});
  cb(null, out);
};

add(Coffeescript, function(path) {
  return /coffee$/.test(path.path);
}); 
