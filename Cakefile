fs = require 'fs'
coffeecmd = require 'coffee-script/lib/coffee-script/command'

option '-w', '--watch', 'watch files for changes'

# Well, it amuses me.
task 'build', 'Build platter.js', (options) ->
  oldargv = process.argv
  process.argv = [
    process.argv[0]
    process.argv[1]
    '-c'
    '-j'
    'platter.js'
    'src/platter.core.coffee'
    'src/platter.core.codegen.coffee'
    'src/platter.plain.coffee'
    'src/platter.dynamic.coffee'
    'src/platter.dynamic.backbone.coffee'
  ]
  if options.watch
    process.argv.splice 2, 0, '-w'
  coffeecmd.run()
  process.argv = oldargv

