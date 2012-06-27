AirDrop = require "#{__dirname}/../lib/air-drop.js"
expected = drop = null

describe "AirDrop", ->
  describe "including source", ->
    describe "with packaging", ->
      describe "with individual paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("#{__dirname}/fixtures/includes/b.js").include("#{__dirname}/fixtures/includes/a.js").package()

        it "builds the package with given files in order", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ba.js"

        it "does not include files twice", ->
          drop.include("#{__dirname}/fixtures/includes/b.js").include("#{__dirname}/fixtures/includes/a.js")
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ba.js"

      describe "with relative paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("./spec/fixtures/includes/b.js").include("./spec/fixtures/includes/a.js").package()

        it "builds the package with given files in order", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ba.js"

      describe "with globbed paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("#{__dirname}/fixtures/includes/*.js").package()

        it "builds the package with all matching files", ->
          expectSourceToMatchFile(drop, "#{__dirname}/fixtures/packaged/ab.js")

        it "does not include files twice", ->
          drop.include("#{__dirname}/fixtures/includes/b.js").include("#{__dirname}/fixtures/includes/a.js")
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ab.js"

    describe "without packaging", ->
      describe "with individual paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("#{__dirname}/fixtures/includes/b.js").include("#{__dirname}/fixtures/includes/a.js").package(false)

        it "builds the package with given files in order", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/unpackaged/ba.js"

      describe "with globbed paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("#{__dirname}/fixtures/includes/*.js").package(false)

        it "builds the package with all matching files", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/unpackaged/ab.js"

    describe "with coffeescripts", ->
      beforeEach ->
        drop = AirDrop("drop").include("#{__dirname}/fixtures/includes/c.coffee").package()

      it "compiles automatically", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/c.js"

  describe "requiring source", ->
    describe "#useBrowserRequire", ->
      beforeEach ->
        drop = AirDrop("drop").useBrowserRequire().package()

      it "includes the browser-require source", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/browser-require.js"

    describe "with individual paths", ->
      beforeEach ->
        drop = AirDrop("drop").useBrowserRequire(false).package().require("#{__dirname}/fixtures/requires/*.js")

      it "wraps the required files and includes them", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/de.js"

    describe "with an explicit name", ->
      beforeEach ->
        drop = AirDrop("drop").useBrowserRequire(false).package().require("#{__dirname}/fixtures/requires/d.js", {name: "d"})

      it "uses the name in the define statement rather than the path", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/d-with-name.js"

    describe "with a root", ->
      beforeEach ->
        drop = AirDrop("drop").useBrowserRequire(false).package().require("d.js", {root: "#{__dirname}/fixtures/requires"})

      it "finds the path relative to the root", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/d-with-name.js"

#     describe "with a root and redundant path", ->
#       beforeEach ->
#         drop = AirDrop("drop").useBrowserRequire(false).package().require("#{__dirname}/fixtures/requires/d.js", {root: "#{__dirname}/fixtures/requires"})
# 
#       it "finds the path relative to the root", ->
#         expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/d-with-name.js"

    describe "with require dependencies", ->
      describe "one layer", ->
        beforeEach ->
          drop = AirDrop("drop").useBrowserRequire(false).package().require("#{__dirname}/fixtures/with-dependencies/h.js")

        it "adds the dependencies", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/with-dependencies/h-packaged.js"

      describe "nested", ->
        beforeEach ->
          drop = AirDrop("drop").useBrowserRequire(false).package().require("#{__dirname}/fixtures/with-dependencies/j.js")

        it "adds the dependencies", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/with-dependencies/j-packaged.js"

      describe "with duplicated dependencies", ->
        beforeEach ->
          drop = AirDrop("drop").useBrowserRequire(false).package().require("#{__dirname}/fixtures/with-dependencies/k.js")

        it "adds the dependencies", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/with-dependencies/k-packaged.js"

  describe "#minimize", ->
    describe "with no args", ->
      beforeEach ->
        drop = AirDrop("drop").minimize()

      it "defaults to AirDrop.Minimizers.Default", ->
        expect(drop.minimizer).toEqual AirDrop.Minimizers.Default

    describe "with true", ->
      beforeEach ->
        drop = AirDrop("drop").minimize(true)

      it "defaults to AirDrop.Minimizers.Default", ->
        expect(drop.minimizer).toEqual AirDrop.Minimizers.Default

    describe "with false", ->
      beforeEach ->
        drop = AirDrop("drop").minimize(false)

      it "sets minimizer to null", ->
        expect(drop.minimizer == AirDrop.Minimizers.None).toBeTruthy()

    describe "with a function", ->
      func = minimizer = null
      beforeEach ->
        minimizer = jasmine.createSpy "custom minimizer"
        drop = AirDrop("drop").minimize(minimizer)

      it "sets the function as the minimizer", ->
        expect(drop.minimizer).toEqual(minimizer)

    describe "with AirDrop.Minimizers.Uglify", ->
      beforeEach ->
        drop = AirDrop("drop").include(__dirname + "/fixtures/includes/a.js")
                              .include(__dirname + "/fixtures/includes/b.js")
                              .minimize(AirDrop.Minimizers.Uglify).package()

      it "mangles and squeezes output", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/uglified/ab.js"

    describe "with custom minimizer", ->
      beforeEach ->
        minimizer = (code, cb) ->
          cb null, "This is minimized! It had #{code.length} characters."
        drop = AirDrop("drop").include(__dirname + "/fixtures/includes/*.js").minimize(minimizer).package()

      it "returns the output of the function", ->
        expectSourceToMatch drop, "This is minimized! It had 131 characters."


  describe "#cache", ->
    describe "with no args", ->
      beforeEach ->
        drop = AirDrop("drop").cache()

      it "defaults to AirDrop.Cachers.Default", ->
        expect(drop.cacher).toEqual AirDrop.Cachers.Default

    describe "with true", ->
      beforeEach ->
        drop = AirDrop("drop").cache(true)

      it "defaults to AirDrop.Cachers.Default", ->
        expect(drop.cacher).toEqual AirDrop.Cachers.Default

    describe "with false", ->
      beforeEach ->
        drop = AirDrop("drop").cache(false)

      it "sets cacher to null", ->
        expect(drop.cacher == AirDrop.Cachers.None).toBeTruthy()

    describe "with a function", ->
      func = cacher = null
      beforeEach ->
        cacher = jasmine.createSpy "custom cacher"
        drop = AirDrop("drop").cache(cacher)

      it "sets the function as the cacher", ->
        expect(drop.cacher).toEqual(cacher)

  describe "#useCachedResult", ->
    value = fetcher = callback = null
    beforeEach ->
      value = "Cached"
      fetcher = (cb) ->
        cb(null, value)
      callback = jasmine.createSpy("callback")

    describe "with AirDrop.Cachers.InMemory", ->
      beforeEach ->
        drop = AirDrop("drop").cache(AirDrop.Cachers.InMemory)
      
      it "fetches the cached version", ->
        drop.useCachedResult("key", fetcher, callback)
        value = "Not Cached"
        drop.useCachedResult("key", fetcher, callback)
        expect(callback.argsForCall[1]).toEqual([null, "Cached"])

    describe "with custom cacher", ->
      beforeEach ->
        customCacher = (key, orig, cb) ->
          orig (err, data) ->
            cb(null, data + " CUSTOM")

        drop = AirDrop("drop").cache(customCacher)

      it "has access to the orig value and can manipulate it", ->
        drop.useCachedResult("key", fetcher, callback)
        expect(callback).toHaveBeenCalledWith(null, "Cached CUSTOM")


  describe "#stripFunction", ->
    beforeEach ->
      drop = AirDrop("drop").include(__dirname + "/fixtures/stripping/strip.js")
                            .stripFunction("stripThis")
                            .package()

    it "mangles and squeezes output", ->
      expectSourceToMatchFile drop, "#{__dirname}/fixtures/stripping/stripped.js"
