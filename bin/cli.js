#!/usr/bin/env node

var token,
    drop,
    pathLib = require('path'),
    AirDrop = require(pathLib.join(__dirname, "..", "lib", "air-drop.js")),
    package = require(pathLib.join(__dirname, "..", "package.json"));

function hasFlag() {
  for(var i=0; i < arguments.length; i++) {
    var flag = arguments[i];
    if (process.argv.indexOf(flag) > -1) return true;
  }
  return false;
}

if (hasFlag("-v", "--version")) {
  console.log(package.version);
  process.exit();
}

if (hasFlag("-h", "--help")) {
  var lines = [
    "Usage: air-drop [options] > my-package.js",
    "Options:",
    "  --css : Treat the package as a CSS package",
    "  --help, -h : Display this help message",
    "  --include [path] : Includes the path into the package",
    "  --minimize : Minimize the package",
    "  --require [path] : Requires the path into the package",
    "  --strip-function [name] : Remove uses of the named function from the package",
    "  --version, -v : Display the version of air-drop"
  ];
  console.log(lines.join("\n"));
  process.exit();
}

if (hasFlag("--css")) {
  drop = AirDrop("main.css");
} else {
  drop = AirDrop("main.js");
}

if (hasFlag("--minimize")) drop.minimize();

drop.package();

while (token = process.argv.shift()) {
  if (token === "--include" || token === "-i") {
    drop.include(process.argv.shift());
  }
  else if (token === "--require" || token === "-r") {
    drop.require(process.argv.shift());
  }
  else if (token === "--strip-function" || token === "-s") {
    drop.stripFunction(process.argv.shift());
  }
}

var trySource = function() {
  setTimeout(function() {
    if (drop.paths.length > 0) {
      drop.source(function(err, source) {
        if (err) {
          process.stderr.write("Error: " + err);
        }
        else {
          process.stdout.write(source);
        }
      });
    }
    else {
      trySource();
    }
  }, 1000);
}

trySource();
