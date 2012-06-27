Path = require "#{__dirname}/../lib/path"

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
    
    it "returns an array of absolute paths to modules", ->
      paths = null
      base = "#{__dirname}/fixtures/with-dependencies"
      @path.dependencyPaths (err, data) ->
        paths = data
      waitsFor -> paths
      runs -> expect(paths).toEqual ["#{base}/f.js", "#{base}/g.coffee"]
