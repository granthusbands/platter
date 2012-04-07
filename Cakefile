fs = require 'fs'
coffee = require 'coffee-script'

option '-w', '--watch', 'watch files for changes'


files = [
    'src/platter.base.coffee'
    'src/platter.core.pluginbase.coffee'
    'src/platter.core.coffee'
    'src/platter.helper.text.coffee'
    'src/platter.helper.html.coffee'
    'src/platter.helper.undo.coffee'
    'src/platter.core.browser.coffee'
    'src/platter.core.debug.coffee'
    'src/platter.core.parse.coffee'
    'src/platter.core.codegen.coffee'
    'src/platter.plain.coffee'
    'src/platter.dynamic.coffee'
    'src/platter.dynamic.backbone.coffee'
    'src/platter.plugin.if.coffee'
    'src/platter.plugin.with.coffee'
    'src/platter.plugin.foreach.coffee'
    'src/platter.plugin.events.coffee'
    'src/platter.plugin.textarea.coffee'
    'src/platter.plugin.value.coffee'
]


compileFile = (file, watch, cb) ->
    go = ->
        fs.readFile file, 'utf8', (err, data) ->
            if err then cb(err, null)
            else
                try
                  cb(null, coffee.compile data)
                catch error
                  cb(error, null)
    if watch then fs.watch file, go #TODO: Debounce the watching
    go()


compileFiles = (files, watch) ->
    conv = (null for x in files)

    maybeDone = ->
        if (x for x in conv when !x).length == 0
            fs.writeFile 'platter.js', conv.join('\n'), (err) ->
                if err
                    console.log "Could not save platter.js: #{err.message}"
                else
                    console.log "platter.js written"

    for i in [0...files.length] by 1
        do (i) ->
            compileFile files[i], watch, (err, data) ->
                conv[i] = data
                if err
                    console.log "Error: #{files[i]}: #{err.message}"
                else
                    maybeDone()


task 'build', 'Build platter.js', (options) ->
    compileFiles files, options.watch
