fs = require "fs"
pathLib = require "path"

format = (code) ->
  trailingNewline = /(\n|\r)+$/
  leadingWhitespace = /(\n|\r)\s+/g
  code.replace(trailingNewline, "").replace(leadingWhitespace, "\n")

global.expectSourceToMatch = (dropOrSource, content) ->
  actual = error = null
  if dropOrSource.source
    dropOrSource.source((err, data) ->
      error = err
      actual = data
    )
  else
    actual = dropOrSource

  waitsFor ->
    actual || error
  runs ->
    throw error if error
    expect(format(actual)).toEqual format(content)

global.expectSourceToMatchFile = (drop, filename) ->
  content = fs.readFileSync(filename).toString()
  expectSourceToMatch drop, content

fs.readdirSync("#{__dirname}/fixtures/node_modules").forEach (name) ->
  src = "#{__dirname}/fixtures/node_modules/#{name}"
  des = "#{__dirname}/../node_modules/#{name}"
  unless pathLib.existsSync des
    fs.linkSync src, des
