fs = require "fs"

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


