fs = require 'fs'
coffeecmd = require 'coffee-script/lib/coffee-script/command'

option '-w', '--watch', 'watch files for changes'

# Ho-hum
task 'build', 'Build platter.js', (options) ->
  process.argv = [
    process.argv[0]
    process.argv[1]
    '-c'
    (if options.watch then ['-w'] else [])...
    '-j'
    'platter.js'
    'src/platter.core.coffee'
    'src/platter.core.codegen.coffee'
    'src/platter.plain.coffee'
    'src/platter.dynamic.coffee'
    'src/platter.dynamic.backbone.coffee'
  ]
  coffeecmd.run()
