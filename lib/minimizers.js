var Uglify = function(code, cb) {
  var jsp = require("uglify-js").parser;
  var pro = require("uglify-js").uglify;

  var ast = jsp.parse(code); // parse code and get the initial AST
  ast = pro.ast_mangle(ast); // get a new AST with mangled names
  ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
  var minimized = pro.gen_code(ast); // compressed code here

  cb(null, minimized);
}
exports.Uglify = Uglify;
exports.Default = Uglify;

exports.None = function(code, cb) { cb(null, code); }
