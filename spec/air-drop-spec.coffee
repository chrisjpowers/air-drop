fs = require "fs"
AirDrop = require "#{__dirname}/../lib/air-drop.js"
expected = drop = null

expectSourceToMatchFile = (drop, filename) ->
  actual = null
  trailingNewline = /(\n|\r)+$/
  expected = fs.readFileSync(filename).toString().replace(trailingNewline, "")
  drop.source((err, data) ->
    actual = data
  )
  waitsFor -> actual
  runs ->
    expect(actual.replace(trailingNewline, "")).toEqual(expected)

describe "AirDrop", ->
  describe "including source", ->
    describe "with packaging", ->
      describe "with individual paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("spec/fixtures/includes/b.js").include("spec/fixtures/includes/a.js").package()

        it "builds the package with given files in order", ->
          expectSourceToMatchFile drop, "#{__dirname}/fixtures/packaged/ba.js"

      describe "with globbed paths", ->
        beforeEach ->
          drop = AirDrop("drop").include("spec/fixtures/includes/*.js").package()

        it "builds the package with all matching files", ->
          expectSourceToMatchFile(drop, "#{__dirname}/fixtures/packaged/ab.js")

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

