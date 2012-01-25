var cache = {};

var InMemory = function(key, orig, cb) {
  var cachedData = cache[key];
  if(cachedData) {   
    cb(null, cachedData);
  } else {
    orig(function(err, data) {
      cache[key] = data;
      cb(null, data);
    });
  }
};

exports.InMemory = InMemory;
exports.Default = InMemory;
