// Generated by CoffeeScript 1.6.3
(function() {
  var BASE64_CHARS, VLQ_CONTINUATION_BIT, VLQ_SHIFT, VLQ_VALUE_MASK, decodeBase64Char, encodeBase64;

  VLQ_SHIFT = 5;

  VLQ_CONTINUATION_BIT = 1 << VLQ_SHIFT;

  VLQ_VALUE_MASK = VLQ_CONTINUATION_BIT - 1;

  exports.encode = function(value) {
    var answer, nextChunk, signBit, valueToEncode;
    answer = '';
    signBit = value < 0 ? 1 : 0;
    valueToEncode = (Math.abs(value) << 1) + signBit;
    while (valueToEncode || !answer) {
      nextChunk = valueToEncode & VLQ_VALUE_MASK;
      valueToEncode = valueToEncode >> VLQ_SHIFT;
      if (valueToEncode) {
        nextChunk |= VLQ_CONTINUATION_BIT;
      }
      answer += encodeBase64(nextChunk);
    }
    return answer;
  };

  exports.decode = function(str, offset) {
    var consumed, continuationShift, done, nextChunkValue, nextVlqChunk, position, signBit, value;
    if (offset == null) {
      offset = 0;
    }
    position = offset;
    done = false;
    value = 0;
    continuationShift = 0;
    while (!done) {
      nextVlqChunk = decodeBase64Char(str[position]);
      position++;
      nextChunkValue = nextVlqChunk & VLQ_VALUE_MASK;
      value += nextChunkValue << continuationShift;
      if (!(nextVlqChunk & VLQ_CONTINUATION_BIT)) {
        done = true;
      }
      continuationShift += VLQ_SHIFT;
    }
    consumed = position - offset;
    signBit = value & 1;
    value = value >> 1;
    if (signBit) {
      value = -value;
    }
    return [value, consumed];
  };

  exports.decodeValues = function(str) {
    var answer, consumed, nextValue, offset, _ref;
    answer = [];
    offset = 0;
    while (offset < str.length) {
      _ref = exports.decode(str, offset), nextValue = _ref[0], consumed = _ref[1];
      answer.push(nextValue);
      offset += consumed;
      if (consumed === 0) {
        throw new Error("Didn't consume any chars. :(");
      }
    }
    return answer;
  };

  BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  encodeBase64 = function(value) {
    return BASE64_CHARS[value] || (function() {
      throw new Error("Cannot Base64 encode value: " + value);
    })();
  };

  decodeBase64Char = function(char) {
    var answer;
    answer = BASE64_CHARS.indexOf(char);
    if (answer === -1) {
      throw new Error("Invalid Base64 value: " + char);
    }
    return answer;
  };

}).call(this);
