_ = require "underscore"
Path = require "#{__dirname}/../lib/path"
pathLib = require "path"

describe "Path", ->
  describe "#source", ->
    beforeEach ->
      @path = new Path type: "include", path: "#{__dirname}/fixtures/includes/a.js"

    it "loads its source code", ->
      code = null
      @path.source (err, data) ->
        code = data
      waitsFor -> code
      runs ->
        expectSourceToMatchFile code, "#{__dirname}/fixtures/includes/a.js"
  
  describe "#dependencies", ->
    beforeEach ->
      @path = new Path type: "include", path: "#{__dirname}/fixtures/with-dependencies/h.js"

    it "returns an array of required module names", ->
      deps = null
      @path.dependencies (err, data) ->
        deps = data
      waitsFor -> deps
      runs -> expect(deps).toEqual ["./f", "./g"]

  describe "#dependencyPaths", ->
    beforeEach ->
      @path = new Path type: "include", path: "#{__dirname}/fixtures/with-dependencies/h.js"
    
    it "returns an array of Paths with full paths to modules", ->
      paths = null
      base = "#{__dirname}/fixtures/with-dependencies"
      @path.dependencyPaths (err, data) ->
        paths = data
      waitsFor -> paths
      runs ->
        filepaths = _(paths).map (p) -> p.path
        expect(filepaths).toEqual ["#{base}/f", "#{base}/g"]

  describe "paths", ->
    describe "with absolute path", ->
      beforeEach ->
        @path = new Path type: "include", path: "#{__dirname}/fixtures/includes/a.js"

      it "uses the full path", ->
        expect(@path.path).toEqual "#{__dirname}/fixtures/includes/a.js"

      it "has a relative path", ->
        expect(@path.relativePath).toEqual "spec/fixtures/includes/a.js"

    describe "with relative path", ->
      beforeEach ->
        @path = new Path type: "include", path: "./spec/fixtures/includes/a.js"

      it "uses the full path", ->
        expect(@path.path).toEqual "#{__dirname}/fixtures/includes/a.js"

      it "has a relative path", ->
        expect(@path.relativePath).toEqual "spec/fixtures/includes/a.js"


  describe "node modules", ->
    describe "using index.js", ->
      beforeEach ->
        @path = new Path type: "require", path: "module-a"

      it "uses path to index.js", ->
        expect(@path.path).toEqual pathLib.resolve("#{__dirname}/../node_modules/module-a/index.js")

      it "has relative path to index.js", ->
        expect(@path.relativePath).toEqual "node_modules/module-a/index.js"

    describe "using main file from package.json", ->
      beforeEach ->
        @path = new Path type: "require", path: "module-b"

      it "uses path to index.js", ->
        expect(@path.path).toEqual pathLib.resolve("#{__dirname}/../node_modules/module-b/lib/module-b.js")

      it "has relative path to index.js", ->
        expect(@path.relativePath).toEqual "node_modules/module-b/lib/module-b.js"
