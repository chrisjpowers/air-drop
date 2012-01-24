fs = require "fs"
AirDrop = require "#{__dirname}/../lib/air-drop.js"
expected = drop = null

expectSourceToMatch = (drop, content) ->
  actual = null
  trailingNewline = /(\n|\r)+$/
  expected = content.replace(trailingNewline, "")
  drop.source((err, data) ->
    actual = data
  )
  waitsFor -> actual
  runs ->
    expect(actual.replace(trailingNewline, "")).toEqual(expected)

expectSourceToMatchFile = (drop, filename) ->
  content = fs.readFileSync(filename).toString()
  expectSourceToMatch drop, content

describe "AirDrop", ->
  describe "including source", ->
    describe "with packaging", ->
      describe "with individual paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("spec/fixtures/includes/b.js").include("spec/fixtures/includes/a.js").package()

        it "builds the package with given files in order", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ba.js"

        it "does not include files twice", ->
          drop.include("spec/fixtures/includes/b.js").include("spec/fixtures/includes/a.js")
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ba.js"

      describe "with globbed paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("spec/fixtures/includes/*.js").package()

        it "builds the package with all matching files", ->
          expectSourceToMatchFile(drop, "#{__dirname}/fixtures/packaged/ab.js")

        it "does not include files twice", ->
          drop.include("spec/fixtures/includes/b.js").include("spec/fixtures/includes/a.js")
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ab.js"

    describe "without packaging", ->
      describe "with individual paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("spec/fixtures/includes/b.js").include("spec/fixtures/includes/a.js").package(false)

        it "builds the package with given files in order", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/unpackaged/ba.js"

      describe "with globbed paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("spec/fixtures/includes/*.js").package(false)

        it "builds the package with all matching files", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/unpackaged/ab.js"

    describe "with coffeescripts", ->
      beforeEach ->
        drop = AirDrop("drop").include("spec/fixtures/includes/c.coffee").package()

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
        drop = AirDrop("drop").useBrowserRequire(false).package().require("spec/fixtures/requires/*.js")

      it "wraps the required files and includes them", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/de.js"


  describe "#minimize", ->
    describe "with no args", ->
      beforeEach ->
        drop = AirDrop("drop").minimize()

      it "defaults to AirDrop.Minimizers.Uglify", ->
        expect(drop.minimizer).toEqual AirDrop.Minimizers.Uglify

    describe "with true", ->
      beforeEach ->
        drop = AirDrop("drop").minimize(true)

      it "defaults to AirDrop.Minimizers.Uglify", ->
        expect(drop.minimizer).toEqual AirDrop.Minimizers.Uglify

    describe "with false", ->
      beforeEach ->
        drop = AirDrop("drop").minimize(false)

      it "sets minimizer to null", ->
        expect(drop.minimizer).toBeNull()

    describe "with a function", ->
      func = minimizer = null
      beforeEach ->
        minimizer = jasmine.createSpy "custom minimizer"
        drop = AirDrop("drop").minimize(minimizer)

      it "sets the function as the minimizer", ->
        expect(drop.minimizer).toEqual(minimizer)

  
    describe "with AirDrop.Minimizers.Uglify", ->
      beforeEach ->
        drop = AirDrop("drop").include(__dirname + "/fixtures/includes/*.js").minimize(AirDrop.Minimizers.Uglify).package()

      it "mangles and squeezes output", ->
        expectSourceToMatchFile drop, "#{__dirname}/fixtures/uglified/ab.js"

    describe "with custom minimizer", ->
      beforeEach ->
        minimizer = (code) ->
          "This is minimized! It had #{code.length} characters."
        drop = AirDrop("drop").include(__dirname + "/fixtures/includes/*.js").minimize(minimizer).package()

      it "returns the output of the function", ->
        expectSourceToMatch drop, "This is minimized! It had 127 characters."
