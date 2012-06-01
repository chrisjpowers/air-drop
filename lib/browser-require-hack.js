function hackRequire(origRequire) {
  newRequire = function(path) {
    try { return origRequire(path); }
    catch(e) {
      return retryRequire(path, e);
    }
  };

  newRequire.define = origRequire.define;

  return newRequire;

  function retryRequire(path, origError) {
    return origRequire(path.replace(/^\.\//, ""));
  }
}

require = hackRequire(require);
