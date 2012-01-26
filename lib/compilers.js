var compilers = [];

var add = exports.add = function(compiler, test) {
  compilers.unshift([compiler, test]);  
};

exports.choose = function(path) {
  for(var i=0; i < compilers.length; i++) {
    var tuple = compilers[i],
        compiler = tuple[0],
        test = tuple[1];
    if(test(path)) { return compiler; }
  }
  return None;
};

var None = function(data, cb) { cb(null, data) };

var Coffeescript = function(data, cb) {
  var out = require("coffee-script").compile(data, {bare: true});
  cb(null, out);
}

add(Coffeescript, function(path) {
  return /coffee$/.test(path.path);
}); 
