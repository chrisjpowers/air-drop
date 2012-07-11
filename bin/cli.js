#!/usr/bin/env node

var token,
    drop,
    pathLib = require('path'),
    AirDrop = require(pathLib.join(__dirname, "..", "lib", "air-drop.js")),
    package = require(pathLib.join(__dirname, "..", "package.json"));

if (process.argv.indexOf("-v") > -1) {
  console.log(package.version);
  process.exit();
}

if (process.argv.indexOf("--css") > -1) {
  drop = AirDrop("main.css");
} else {
  drop = AirDrop("main.js");
}

if (process.argv.indexOf("--minimize") > -1) drop.minimize();

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
