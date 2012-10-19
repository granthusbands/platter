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
    'src/platter.helper.compare.coffee'
    'src/platter.helper.getset.coffee'
    'src/platter.core.browser.coffee'
    'src/platter.core.debug.coffee'
    'src/platter.core.parse.coffee'
    'src/platter.core.codegen.coffee'
    'src/platter.plain.coffee'
    'src/platter.dynamic.coffee'
    'src/platter.dynamic.backbone.coffee'
    'src/platter.dynamic.batman.coffee'
    'src/platter.dynamic.knockout.coffee'
    'src/platter.dynamic.ember.coffee'
    'src/platter.plugin.attr.checked.coffee'
    'src/platter.plugin.attr.class.coffee'
    'src/platter.plugin.attr.on.coffee'
    'src/platter.plugin.attr.oninput.coffee'
    'src/platter.plugin.attr.value.coffee'
    'src/platter.plugin.el.select.coffee'
    'src/platter.plugin.el.textarea.coffee'
    'src/platter.plugin.extr.foreach.coffee'
    'src/platter.plugin.extr.if.coffee'
    'src/platter.plugin.extr.with.coffee'
    'src/platter.plugin.mark.element.coffee'
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
            txt = conv.join('\n')
            txt = txt.replace(/\}\)\.call\(this\);\s*\(function\(\) \{/g, "")
            fs.writeFile 'platter.js', txt, (err) ->
                if err
                    console.log "Could not save platter.js: #{err.message}"
                else
                    console.log "platter.js written"

    for i in [0...files.length] by 1
        do (i) ->
            compileFile files[i], watch, (err, data) ->
                olddata = conv[i]
                conv[i] = data
                if err
                    console.log "Error: #{files[i]}: #{err.message}"
                else if (olddata!=data)
                    maybeDone()


task 'build', 'Build platter.js', (options) ->
    compileFiles files, options.watch
