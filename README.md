This is a library for reading and writing
[v3 source maps](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit).
It is based on work done by [Jason Walton](https://github.com/jwalton) and
[Jeremy Ashkenas](https://github.com/jashkenas) to add source map support to
[coffee-script](https://github.com/jashkenas/coffee-script).

Usage
=====

Fixing exception stack traces
-----------------------------

Suppose you're working on a large project, and you pre-compile your .coffee files into .js files
to speed up performance, but you want to keep your stack traces pretty:

    SourceMap = require 'coffee-source-map'
    SourceMap.registerErrorHandler()

Whenever an exception stack trace is rendered, this will try to open every .js file in the stack
trace, find the associated .map file, and fix up the exception.

Reading source maps
-------------------

You can read a SourceMap from a string with:

    mapString = fs.readFileSync mapFileName, "utf-8"
    sourceMap = SourceMap.load mapString, generatedFileName

If you have a generated file with a `//# sourceMappingURL=...` line, you can load the map from the
generated file:

    sourceMap = SourceMap.loadForSourceFileSync generatedFileName

Once you have a sourceMap, you can query it to get source code file names and positions:

    [sourceFile, sourceLine, sourceColumn] = sourceMap.sourceLocation [generatedLine, generatedColumn]

Note that all values are 0-based!

Writing source maps
-------------------

Generate a source map and add mappings to it with:

    sourceMap = new SourceMap generatedFile
    sourceMap.add(
        sourceFile,
        [sourceLine, sourceColumn],
        [generatedLine, generatedColumn]
    )

You can write a v3 source map with:

    v3Map = sourceMap.generate {sourceRoot: ""}

