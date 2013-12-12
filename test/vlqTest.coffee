vlq = require '../src/vlq'
assert = require 'assert'

vlqEncodedValues = [
    [1, "C"],
    [-1, "D"],
    [2, "E"],
    [-2, "F"],
    [0, "A"],
    [16, "gB"],
    [948, "o7B"]
]

describe "vlq", ->
    it "should correctly encode vlq values", ->
        for pair in vlqEncodedValues
            assert.equal pair[1], vlq.encode pair[0]

    it "should correctly decode vlq values", ->
        for pair in vlqEncodedValues
            [value, consumed] = vlq.decode pair[1]
            assert.equal pair[0], value
            assert.equal pair[1].length, consumed

    it "should correctly decode multiple values", ->
        decodedValues = vlqEncodedValues.map (pair) -> pair[0]
        encodedValues = vlqEncodedValues.map( (pair) -> pair[1] ).join('')
        assert.deepEqual decodedValues, vlq.decodeValues encodedValues
