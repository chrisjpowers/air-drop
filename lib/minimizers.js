var Uglify = function(code) {
  var jsp = require("uglify-js").parser;
  var pro = require("uglify-js").uglify;

  var ast = jsp.parse(code); // parse code and get the initial AST
  ast = pro.ast_mangle(ast); // get a new AST with mangled names
  ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
  return pro.gen_code(ast); // compressed code here
}
exports.Uglify = Uglify;
exports.Default = Uglify;

exports.None = function(code) { return code; }
