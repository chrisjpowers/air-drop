var _ = require("underscore"),
    async = require("async");

exports.map = function (arr, iterator, origCb) {
  var arrWithIndexes = _(arr).map(function(item, i) { return [item, i]; });
  var wrappedIterator = function(tuple, cb) {
    var origItem = tuple[0],
        i = tuple[1];
    iterator(origItem, function(err, result) {
      cb(err, [result, i]);
    });
  };
      
  async.map(arrWithIndexes, wrappedIterator, function(err, tuples) {
    try {
      if(err) { throw err }
      var orderedItems = [];
      _(tuples).each(function(tuple) {
        var item = tuple[0],
            i = tuple[1];
        orderedItems[i] = item;
      });
      origCb(null, orderedItems);
    } catch(e) {
      origCb(e);
    }
  });
};

exports.concat = function(arr, iterator, cb) {
  exports.map(arr, iterator, function(err, items) {
    try {
      if(err) { throw err; }
      if (items.length === 0) return cb(null, []);

      var head = items.shift();
      for(var i=0; i < items.length; i++) {
        head = head.concat(items[i]);
      }
      cb(null, head);
    }
    catch(e) {
      cb(err);
    }
  });
};
