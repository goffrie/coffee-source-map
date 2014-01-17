Source maps allow JavaScript runtimes to match running JavaScript back to
the original source code that corresponds to it. This can be used for minified
JavaScript, or for mapping pretty-printed JavaScript back to CoffeeScript or some
other language.

    fs = require 'fs'
    path = require 'path'
    vlq = require './vlq'

LineMap
-------

A **LineMap** object keeps track of information about original line and column
positions for a single line of output JavaScript code.
**SourceMaps** are implemented in terms of **LineMaps**.

    class LineMap
        constructor: (@line) ->
            @columns = []

        add: (column, sourceFile, [sourceLine, sourceColumn], options={}) ->
            return if @columns[column] and options.noReplace
            @columns[column] = {
                line: @line,
                column,
                sourceLine,
                sourceColumn,
                sourceFile
            }

        sourceLocation: (column) ->
            column-- until (mapping = @columns[column]) or (column <= 0)
            mapping and [mapping.sourceFile, mapping.sourceLine, mapping.sourceColumn]


SourceMap
---------

Maps locations in a single generated JavaScript file back to locations in
the original CoffeeScript source file.

This is intentionally agnostic towards how a source map might be represented on
disk. Once the compiler is ready to produce a "v3"-style source map, we can walk
through the arrays of line and column buffer to produce it.

    class SourceMap
        constructor: (@generatedFile) ->
            # Lines of generated source code.
            @lines = []

Adds a mapping to this SourceMap. `sourceLocation` and `generatedLocation`
are both `[line, column]` arrays.  If `options.noReplace` is true, then if there is already a
mapping for the specified `line` and `column`, this will have no effect.

        add: (sourceFile, sourceLocation, generatedLocation, options = {}) ->
            [line, column] = generatedLocation
            lineMap = (@lines[line] or= new LineMap(line))
            lineMap.add column, sourceFile, sourceLocation, options

Look up the original position of a given `line` and `column` in the generated
code.  Returns a `[sourceFile, line, column]` object.

        sourceLocation: ([line, column]) ->
            line-- until (lineMap = @lines[line]) or (line <= 0)
            lineMap and lineMap.sourceLocation column


V3 SourceMap Generation
-----------------------

Builds up a V3 source map, returning the generated JSON as a string.
`options.sourceRoot` may be used to specify the sourceRoot written to the source
map.

        generate: (options = {}, code = null) ->
            writingline       = 0
            lastColumn        = 0
            lastSourceIndex   = 0
            lastSourceLine    = 0
            lastSourceColumn  = 0
            needComma         = no
            buffer            = ""
            sources = []

            for lineMap, lineNumber in @lines when lineMap
                for mapping in lineMap.columns when mapping
                    while writingline < mapping.line
                        lastColumn = 0
                        needComma = no
                        buffer += ";"
                        writingline++

Write a comma if we've already written a segment on this line.

                    if needComma
                        buffer += ","
                        needComma = no

Write the next segment. Segments can be 1, 4, or 5 values.  If just one, then it
is a generated column which doesn't match anything in the source code.

The starting column in the generated source, relative to any previous recorded
column for the current line:

                    buffer += vlq.encode mapping.column - lastColumn
                    lastColumn = mapping.column

The index into the list of sources:

                    sourceIndex = sources.indexOf mapping.sourceFile
                    if sourceIndex == -1
                        sources.push mapping.sourceFile
                        sourceIndex = sources.length - 1
                    buffer += vlq.encode sourceIndex - lastSourceIndex
                    lastSourceIndex = sourceIndex

The starting line in the original source, relative to the previous source line.

                    buffer += vlq.encode mapping.sourceLine - lastSourceLine
                    lastSourceLine = mapping.sourceLine

The starting column in the original source, relative to the previous column.

                    buffer += vlq.encode mapping.sourceColumn - lastSourceColumn
                    lastSourceColumn = mapping.sourceColumn
                    needComma = yes

Produce the canonical JSON object format for a "v3" source map.

            v3 =
                version:    3
                file:       @generatedFile
                sourceRoot: options.sourceRoot or ''
                sources:    sources
                names:      []
                mappings:   buffer

            v3.sourcesContent = [code] if options.inline

            JSON.stringify v3, null, 2


V3 SourceMap Loading
--------------------

Loads a V3 source map into a new SourceMap object.

        @load: (v3MapString, generatedFile) ->
            answer = new SourceMap generatedFile
            v3 = JSON.parse v3MapString

Most fields in v3 sourcemaps are relative to the previous occurence, so set them all to 0 here.

            sourceIndex = 0
            sourceLine = 0
            sourceColumn = 0
            nameIndex = 0

            lines = v3.mappings.split ';'
            for line, generatedLine in lines
                if line.length is 0 then continue

                # generatedColumn resets to 0 with each new line.
                generatedColumn = 0
                sourceFile = v3.sources[sourceIndex] or ''
                name = v3.names[nameIndex] or ''

                segments = line.split ','
                for segment in segments
                    values = vlq.decodeValues segment
                    generatedColumn += values[0]
                    if values.length >= 4
                        sourceIndex += values[1]
                        sourceFile = v3.sources[sourceIndex] or ''
                        sourceLine += values[2]
                        sourceColumn += values[3]
                    if values.length >= 5
                        nameIndex += values[4]
                        name = v3.names[nameIndex] or ''

                    answer.add(
                        sourceFile,
                        [sourceLine, sourceColumn],
                        [generatedLine, generatedColumn]
                    )

            return answer

        V3_SOURCEMAP_REGEX = /\n?\/\/#\s*sourceMappingURL\s*=\s*(\S*)\s*\n?/

        @loadForSourceFileSync: (generatedFile) ->
            answer = null

            source = fs.readFileSync generatedFile, "utf-8"

            match = V3_SOURCEMAP_REGEX.exec source
            if match
                mapFile = match[1]
                sourceDir = path.dirname generatedFile
                mapFile = path.resolve sourceDir, mapFile
                v3Map = fs.readFileSync mapFile, "utf-8"
                answer = @load v3Map

            return answer


Stack Trace Support
-------------------

Based on [michaelficarra/CoffeeScriptRedux](http://goo.gl/ZTx1p)
NodeJS / V8 has no support for transforming positions in stack traces using
sourceMap, so we must monkey-patch Error to display source positions.

`useExisting` signals that we should try to patch an existing
Erorr.prepareStackTrace method. This may not play well with all handlers
though, such as CoffeeScript's, which causes line numbers to be
double-processed.

        @registerErrorHandler: (useExisting = false) ->
            sourceMapCache = {}

Use an existing prepareStackTrace, if desired.

            prepareStackTrace = if useExisting && Error.prepareStackTrace?
                Error.prepareStackTrace
            else

This is equivalent to the default V8 method.

                (err, stack) ->
                    buf = []
                    if err.name || err.message
                        buf.push "#{err.name}: #{err.message ? ''}"
                    for s in stack
                        try
                            line = "    at #{s.toString()}"
                        catch e
                            try
                                line = "<error: " + e + ">"
                            catch e
                                line = "<error>"
                        buf.push line
                    buf.join("\n") + "\n"

            getSourceMap = (filename) ->
                if filename of sourceMapCache
                    sourceMap = sourceMapCache[filename]
                else
                    try
                        sourceMap = SourceMap.loadForSourceFileSync filename
                    catch err
                        sourceMap = null
                    sourceMapCache[filename] = sourceMap

                return sourceMap

            getSourceMapping = (filename, line, column) ->
                sourceMap = getSourceMap filename
                sourceMap.sourceLocation [line - 1, column - 1] if sourceMap

Process a stack frame, modifying its filename and line/col number if we have
source map data. This updates the object in-place.

            mungeStackFrame = (frame) ->
                return if frame.isNative()
                fileName = if frame.isEval()
                    frame.getScriptNameOrSourceURL()
                else
                    frame.getFileName()
                fileName ||= "<anonymous>"
                line = frame.getLineNumber()
                column = frame.getColumnNumber()

                source = getSourceMapping fileName, line, column

                if source
                    [fileName, line, column] = source
                    line += 1
                    column += 1

                    Object.defineProperties frame, {
                        getFileName: { value: -> fileName }
                        getLineNumber: { value: -> line }
                        getColumnNumber: { value: -> column }
                    }

            Error.prepareStackTrace = (err, stack) ->
                for frame in stack
                    break if frame.getFunction() is exports.run
                    mungeStackFrame frame

                prepareStackTrace err, stack

Our API for source maps is just the `SourceMap` class.

    module.exports = SourceMap

