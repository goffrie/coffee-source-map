Base64 VLQ Encoding
-------------------

Note that SourceMap VLQ encoding is "backwards".  MIDI-style VLQ encoding puts
the most-significant-bit (MSB) from the original value into the MSB of the VLQ
encoded value (see [Wikipedia](http://en.wikipedia.org/wiki/File:Uintvar_coding.svg)).
SourceMap VLQ does things the other way around, with the least significat four
bits of the original value encoded into the first byte of the VLQ encoded value.

    VLQ_SHIFT            = 5
    VLQ_CONTINUATION_BIT = 1 << VLQ_SHIFT             # 0010 0000
    VLQ_VALUE_MASK       = VLQ_CONTINUATION_BIT - 1   # 0001 1111

    exports.encode = (value) ->
        answer = ''

        # Least significant bit represents the sign.
        signBit = if value < 0 then 1 else 0

        # The next bits are the actual value.
        valueToEncode = (Math.abs(value) << 1) + signBit

        # Make sure we encode at least one character, even if valueToEncode is 0.
        while valueToEncode or not answer
            nextChunk = valueToEncode & VLQ_VALUE_MASK
            valueToEncode = valueToEncode >> VLQ_SHIFT
            nextChunk |= VLQ_CONTINUATION_BIT if valueToEncode
            answer += encodeBase64 nextChunk

        answer

Decode a base 64 VLQ value.  Return `[value, consumed]` where `consumed` is the number of
characters consumed from `str.`

    exports.decode = (str, offset=0) ->
        position = offset
        done = false

        value = 0
        continuationShift = 0

        while !done
            nextVlqChunk = decodeBase64Char(str[position])
            position++

            nextChunkValue = nextVlqChunk & VLQ_VALUE_MASK
            value += (nextChunkValue << continuationShift)

If no continuation bit, we'll be done after this character.

            if !(nextVlqChunk & VLQ_CONTINUATION_BIT)
                done = true

Bits are encoded least-significant first (opposite of MIDI VLQ).  Increase the
continuationShift, so the next byte will end up where it should in the value.

            continuationShift += VLQ_SHIFT

        consumed = position - offset

        signBit = value & 1
        value = value >> 1

        if signBit then value = -value

        return [value, consumed]

Returns an array of VLQ values.

    exports.decodeValues = (str) ->
        answer = []
        offset = 0
        while offset < str.length
            [nextValue, consumed] = exports.decode str, offset
            answer.push nextValue
            offset += consumed
            if consumed is 0 then throw new Error "Didn't consume any chars. :("

        answer

Regular Base64 Encoding
-----------------------

    BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    encodeBase64 = (value) ->
        BASE64_CHARS[value] or throw new Error "Cannot Base64 encode value: #{value}"

    decodeBase64Char = (char) ->
        answer = BASE64_CHARS.indexOf char
        if answer is -1 then throw new Error "Invalid Base64 value: #{char}"
        answer
