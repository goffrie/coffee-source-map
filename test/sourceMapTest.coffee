SourceMap = require '../src/sourcemap'
assert = require 'assert'

TEST_MAP = '{"version":3,"file":"source.js","sourceRoot":"","sources":["source.coffee"],"names":[],"mappings":"AAAA;;IACK,GAAC,CAAG;IAET"}'

eqJson = (a, b) ->
    assert.equal (JSON.stringify JSON.parse a), (JSON.stringify JSON.parse b)

describe "sourcemap", ->
    it "should correctly generate a source map", ->
        map = new SourceMap "source.js"
        map.add "source.coffee", [0, 0], [0, 0]
        map.add "source.coffee", [1, 5], [2, 4]
        map.add "source.coffee", [1, 6], [2, 7]
        map.add "source.coffee", [1, 9], [2, 8]
        map.add "source.coffee", [3, 0], [3, 4]

        v3Map = map.generate {sourceRoot: ""}
        eqJson v3Map, TEST_MAP

        # Look up a generated column - should get back the original source position.
        assert.deepEqual map.sourceLocation([2,8]), ["source.coffee", 1,9]

        # Look up a point futher along on the same line - should get back the same source position.
        assert.deepEqual map.sourceLocation([2,10]), ["source.coffee", 1,9]

    it "should correctly parse a source map", ->
        map = SourceMap.load TEST_MAP, "source.js"

        v3Map = map.generate {sourceRoot: ""}
        eqJson v3Map, '{"version":3,"file":"source.js","sourceRoot":"","sources":["source.coffee"],"names":[],"mappings":"AAAA;;IACK,GAAC,CAAG;IAET"}'
        assert.deepEqual map.sourceLocation([2,8]), ["source.coffee", 1,9]
        assert.deepEqual map.sourceLocation([2,10]), ["source.coffee", 1,9]