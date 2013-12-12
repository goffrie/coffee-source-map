This is a library for reading and writing
[v3 source maps](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit).
It is based on work done by [Jason Walton](https://github.com/jwalton) and
[Jeremy Ashkenas](https://github.com/jashkenas) to add source map support to
[cofee-script](https://github.com/jashkenas/coffee-script).

Installation
------------

Usage
-----

Fixing exception stack traces
=============================

Suppose you're working on a large project, and you pre-compile your .coffee files into .js files
to speed up performance, but you want to keep your stack traces pretty:

    SourceMap = require 'coffee-source-map'
    SourceMap.registerErrorHandler()

Whenever an exception stack trace is rendered, this will try to open every .js file in the stack
trace, find the associated .map file, and fix up the exception.

Reading source maps
===================

Writing source maps
===================

