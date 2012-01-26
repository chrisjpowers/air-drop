var pathLib = require("path");

function Path(options) {
  this.type = options.type;
  this.path = options.path;
  this.name = options.name;
};
module.exports = Path;

Path.prototype = {
  moduleName: function() {
    if(this.name) { return this.name; }
    return pathLib.dirname(this.path) + "/" + pathLib.basename(this.path, pathLib.extname(this.path));
  }
};
