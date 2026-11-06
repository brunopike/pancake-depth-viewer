import {createRequire as __createRequire} from 'node:module';const require=__createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    var array = require_postgres_array();
    module.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/xtend/mutable.js"(exports, module) {
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key2 in source) {
          if (hasOwnProperty.call(source, key2)) {
            target[key2] = source[key2];
          }
        }
      }
      return target;
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    var extend = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-types/lib/textParsers.js"(exports, module) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module.exports = {
      init
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad2;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad2 = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad2 += "0";
        }
        result = pad2 + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad2 = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad2 += "0";
        }
        result = pad2 + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad2 = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad2 += "0";
        }
        result = pad2 + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module.exports = readInt8;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module.exports = {
      init
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-types/lib/builtins.js"(exports, module) {
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    var defaults2 = require_defaults();
    var nodeUtils = __require("util");
    var { isDate } = __require("util/types");
    var invalidDateDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Sending an invalid date to Postgres is deprecated and will throw an error in the next major version of pg. Ensure any Date object passed as a query parameter is valid.",
      "PG_INVALID_DATE"
    );
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (isNaN(val.getTime())) {
            invalidDateDeprecationNotice();
          }
          if (defaults2.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : cloneQueryConfig(config);
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    function cloneQueryConfig(config) {
      if (config == null) {
        return config;
      }
      return Object.defineProperties(Object.create(Object.getPrototypeOf(config)), Object.getOwnPropertyDescriptors(config));
    }
    var escapeIdentifier2 = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral2 = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier: escapeIdentifier2,
      escapeLiteral: escapeLiteral2
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/crypto/utils.js"(exports, module) {
    var nodeCrypto = __require("crypto");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash2 = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash2)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key2 = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key2, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key2 = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key2, 32 * 8, ["deriveBits"]);
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/crypto/cert-signatures.js"(exports, module) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https://github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    var crypto = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto.sha256(clientKey);
      const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    function TypeOverrides2(userTypes) {
      this._types = userTypes || types2;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides2.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides2.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides2.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module.exports = TypeOverrides2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = (dummyHost ? "" : result.hostname).replace(/^\[(.+)\]$/, "$1");
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key2, value]) => {
        if (value !== void 0 && value !== null) {
          c[key2] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key2, value]) => {
        if (key2 === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key2] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key2] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key2 === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key2}: ${value}`);
              }
              c[key2] = v;
            }
          } else {
            c[key2] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    var dns = __require("dns");
    var defaults2 = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key2, config, envVar) {
      if (config[key2]) {
        return config[key2];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key2.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults2[key2];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address2) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address2));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/result.js
var require_result = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result2 = class {
      constructor(rowMode, types3) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types3;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types2.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/query.js
var require_query = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    var { EventEmitter } = __require("events");
    var Result2 = require_result();
    var utils = require_utils();
    var Query2 = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result2(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result2(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] !== void 0 || connection.submittedNamedStatements[this.name] !== void 0);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError2 = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError2;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size2 = 256) {
        this.size = size2;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size2);
      }
      ensure(size2) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size2) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size2;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer, 0, 0, this.offset);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      /**
       * Appends an uninitialized block of {@link size} bytes to the buffer and returns its offset.
       */
      reserveUnsafe(size2) {
        const offset = this.offset;
        this.ensure(size2);
        this.offset += size2;
        return offset;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports.Writer = Writer;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key2 of Object.keys(opts)) {
        writer.addCString(key2).addCString(opts[key2]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types2 = query2.types || emptyArray;
      const len = types2.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types2[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var writeValues = function(values, valueMapper, formatsOffset) {
      const len = values.length;
      for (let i = 0; i < len; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        let formatByte = 0;
        if (mappedVal == null) {
          writer.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          formatByte = 1;
          writer.addInt32(mappedVal.length);
          writer.add(mappedVal);
        } else {
          writer.addInt32PrefixedString(mappedVal);
        }
        const buf = writer.buffer;
        buf[formatsOffset++] = 0;
        buf[formatsOffset++] = formatByte;
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      const formatsOffset = writer.reserveUnsafe(len * 2);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper, formatsOffset);
      } catch (err) {
        writer.clear();
        throw err;
      }
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader: reader2 } = this;
        reader2.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader2);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader2);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader2);
            break;
          case 65:
            message = parseNotificationMessage(reader2);
            break;
          case 82:
            message = parseAuthenticationResponse(reader2, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader2);
            break;
          case 75:
            message = parseBackendKeyData(reader2);
            break;
          case 69:
            message = parseErrorMessage(reader2, "error");
            break;
          case 78:
            message = parseErrorMessage(reader2, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader2);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader2);
            break;
          case 71:
            message = parseCopyInMessage(reader2);
            break;
          case 72:
            message = parseCopyOutMessage(reader2);
            break;
          case 100:
            message = parseCopyData(reader2, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader2.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports.Parser = Parser;
    var parseReadyForQueryMessage = (reader2) => {
      const status = reader2.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader2) => {
      const text = reader2.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader2, length) => {
      const chunk = reader2.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader2) => parseCopyMessage(reader2, "copyInResponse");
    var parseCopyOutMessage = (reader2) => parseCopyMessage(reader2, "copyOutResponse");
    var parseCopyMessage = (reader2, messageName) => {
      const isBinary = reader2.byte() !== 0;
      const columnCount = reader2.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader2.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader2) => {
      const processId = reader2.int32();
      const channel = reader2.cstring();
      const payload = reader2.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader2) => {
      const fieldCount = reader2.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader2);
      }
      return message;
    };
    var parseField = (reader2) => {
      const name = reader2.cstring();
      const tableID = reader2.uint32();
      const columnID = reader2.int16();
      const dataTypeID = reader2.uint32();
      const dataTypeSize = reader2.int16();
      const dataTypeModifier = reader2.int32();
      const mode = reader2.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader2) => {
      const parameterCount = reader2.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader2.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader2) => {
      const fieldCount = reader2.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader2.int32();
        fields[i] = len === -1 ? null : reader2.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader2) => {
      const name = reader2.cstring();
      const value = reader2.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader2) => {
      const processID = reader2.int32();
      const secretKey = reader2.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader2, length) => {
      const code = reader2.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader2.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader2.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader2.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader2.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader2, name) => {
      const fields = {};
      let fieldType = reader2.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader2.cstring();
        fieldType = reader2.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = void 0;
    exports.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-cloudflare/dist/empty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {};
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/stream.js"(exports, module) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = __require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = __require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection2 = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream,
          // tls.connect checks the server identity against `servername`, falling
          // back to `host` and then to 'localhost'. `servername` must stay unset
          // for IP addresses (see below), so `host` is needed to keep certificate
          // validation working when connecting to an IP address.
          host
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = __require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/split2/index.js
var require_split2 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/split2/index.js"(exports, module) {
    "use strict";
    var { Transform } = __require("stream");
    var { StringDecoder } = __require("string_decoder");
    var kLast = /* @__PURE__ */ Symbol("last");
    var kDecoder = /* @__PURE__ */ Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split2(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module.exports = split2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var Stream = __require("stream").Stream;
    var split2 = require_split2();
    var util = __require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split2());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var fs = __require("fs");
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/client.js
var require_client = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/client.js"(exports, module) {
    var EventEmitter = __require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = __require("util");
    var sasl = require_sasl();
    var TypeOverrides2 = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query2 = require_query();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var crypto = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client2 = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides2(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection2({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query2(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (this.pipeline) {
          const portalQuery = typeof config.submit === "function" && !(query instanceof Query2) ? "Custom query classes such as pg-cursor and pg-query-stream are" : query.rows ? "The `rows` option is" : null;
          if (portalQuery) {
            process.nextTick(() => {
              query.handleError(new Error(`${portalQuery} not supported in pipeline mode`), this.connection);
            });
            return result;
          }
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client2.Query = Query2;
    module.exports = Client2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool2 = class extends EventEmitter {
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var utils = require_utils();
    var NativeQuery = module.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      messageDetail: "detail",
      messageHint: "hint",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key2 in fields) {
          const normalizedFieldName = errorFieldMap[key2] || key2;
          err[normalizedFieldName] = fields[key2];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name] !== void 0) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/native/client.js"(exports, module) {
    var nodeUtils = __require("util");
    var Native;
    try {
      Native = __require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides2 = require_type_overrides();
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client2 = module.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides2(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client2.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name, arrayMode: query._arrayMode };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          self._connected = false;
          self._queryable = false;
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._errorAllQueries(err);
          self.emit("error", err);
          self.emit("end");
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client2.prototype.isConnected = function() {
      return this._connected;
    };
    Client2.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    module.exports = require_client2();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    var Client2 = require_client();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var Result2 = require_result();
    var utils = require_utils();
    var Pool2 = require_pg_pool();
    var TypeOverrides2 = require_type_overrides();
    var { DatabaseError: DatabaseError2 } = require_dist();
    var { escapeIdentifier: escapeIdentifier2, escapeLiteral: escapeLiteral2 } = require_utils();
    var poolFactory = (Client3) => {
      return class BoundPool extends Pool2 {
        constructor(options) {
          super(options, Client3);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults2;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection2;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError2;
      this.TypeOverrides = TypeOverrides2;
      this.escapeIdentifier = escapeIdentifier2;
      this.escapeLiteral = escapeLiteral2;
      this.Result = Result2;
      this.utils = utils;
    };
    var clientConstructor = Client2;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module.exports = new PG(clientConstructor);
    Object.defineProperty(module.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/headers.js
var require_headers = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/headers.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var headers_exports = {};
    __export2(headers_exports, {
      CITY_HEADER_NAME: () => CITY_HEADER_NAME,
      COUNTRY_HEADER_NAME: () => COUNTRY_HEADER_NAME,
      EMOJI_FLAG_UNICODE_STARTING_POSITION: () => EMOJI_FLAG_UNICODE_STARTING_POSITION,
      IP_HEADER_NAME: () => IP_HEADER_NAME,
      LATITUDE_HEADER_NAME: () => LATITUDE_HEADER_NAME,
      LONGITUDE_HEADER_NAME: () => LONGITUDE_HEADER_NAME,
      POSTAL_CODE_HEADER_NAME: () => POSTAL_CODE_HEADER_NAME,
      REGION_HEADER_NAME: () => REGION_HEADER_NAME,
      REQUEST_ID_HEADER_NAME: () => REQUEST_ID_HEADER_NAME,
      geolocation: () => geolocation2,
      ipAddress: () => ipAddress2
    });
    module.exports = __toCommonJS(headers_exports);
    var CITY_HEADER_NAME = "x-vercel-ip-city";
    var COUNTRY_HEADER_NAME = "x-vercel-ip-country";
    var IP_HEADER_NAME = "x-real-ip";
    var LATITUDE_HEADER_NAME = "x-vercel-ip-latitude";
    var LONGITUDE_HEADER_NAME = "x-vercel-ip-longitude";
    var REGION_HEADER_NAME = "x-vercel-ip-country-region";
    var POSTAL_CODE_HEADER_NAME = "x-vercel-ip-postal-code";
    var REQUEST_ID_HEADER_NAME = "x-vercel-id";
    var EMOJI_FLAG_UNICODE_STARTING_POSITION = 127397;
    function getHeader(headers, key2) {
      return headers.get(key2) ?? void 0;
    }
    function hasRequestHeaders(input) {
      return "headers" in input && typeof input.headers?.get === "function";
    }
    function getHeaderWithDecode(request, key2) {
      const header = getHeader(request.headers, key2);
      return header ? decodeURIComponent(header) : void 0;
    }
    function getFlag(countryCode) {
      const regex = new RegExp("^[A-Z]{2}$").test(countryCode);
      if (!countryCode || !regex)
        return void 0;
      return String.fromCodePoint(
        ...countryCode.split("").map((char) => EMOJI_FLAG_UNICODE_STARTING_POSITION + char.charCodeAt(0))
      );
    }
    function ipAddress2(input) {
      const headers = hasRequestHeaders(input) ? input.headers : input;
      return getHeader(headers, IP_HEADER_NAME);
    }
    function getRegionFromRequestId(requestId) {
      if (!requestId) {
        return "dev1";
      }
      return requestId.split(":")[0];
    }
    function geolocation2(request) {
      return {
        // city name may be encoded to support multi-byte characters
        city: getHeaderWithDecode(request, CITY_HEADER_NAME),
        country: getHeader(request.headers, COUNTRY_HEADER_NAME),
        flag: getFlag(getHeader(request.headers, COUNTRY_HEADER_NAME)),
        countryRegion: getHeader(request.headers, REGION_HEADER_NAME),
        region: getRegionFromRequestId(
          getHeader(request.headers, REQUEST_ID_HEADER_NAME)
        ),
        latitude: getHeader(request.headers, LATITUDE_HEADER_NAME),
        longitude: getHeader(request.headers, LONGITUDE_HEADER_NAME),
        postalCode: getHeader(request.headers, POSTAL_CODE_HEADER_NAME)
      };
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/get-env.js
var require_get_env = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/get-env.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var get_env_exports = {};
    __export2(get_env_exports, {
      getEnv: () => getEnv2
    });
    module.exports = __toCommonJS(get_env_exports);
    var getEnv2 = (env = process.env) => ({
      /**
       * An indicator to show that System Environment Variables have been exposed to your project's Deployments.
       * @example "1"
       */
      VERCEL: get(env, "VERCEL"),
      /**
       * An indicator that the code is running in a Continuous Integration environment.
       * @example "1"
       */
      CI: get(env, "CI"),
      /**
       * The Environment that the app is deployed and running on.
       * @example "production"
       */
      VERCEL_ENV: get(env, "VERCEL_ENV"),
      /**
       * The domain name of the generated deployment URL. The value does not include the protocol scheme https://.
       * NOTE: This Variable cannot be used in conjunction with Standard Deployment Protection.
       * @example "*.vercel.app"
       */
      VERCEL_URL: get(env, "VERCEL_URL"),
      /**
       * The domain name of the generated Git branch URL. The value does not include the protocol scheme https://.
       * @example "*-git-*.vercel.app"
       */
      VERCEL_BRANCH_URL: get(env, "VERCEL_BRANCH_URL"),
      /**
       * A production domain name of the project. This is useful to reliably generate links that point to production such as OG-image URLs.
       * The value does not include the protocol scheme https://.
       * @example "myproject.vercel.app"
       */
      VERCEL_PROJECT_PRODUCTION_URL: get(env, "VERCEL_PROJECT_PRODUCTION_URL"),
      /**
       * The ID of the Region where the app is running.
       *
       * Possible values:
       * - arn1 (Stockholm, Sweden)
       * - bom1 (Mumbai, India)
       * - cdg1 (Paris, France)
       * - cle1 (Cleveland, USA)
       * - cpt1 (Cape Town, South Africa)
       * - dub1 (Dublin, Ireland)
       * - fra1 (Frankfurt, Germany)
       * - gru1 (São Paulo, Brazil)
       * - hkg1 (Hong Kong)
       * - hnd1 (Tokyo, Japan)
       * - iad1 (Washington, D.C., USA)
       * - icn1 (Seoul, South Korea)
       * - kix1 (Osaka, Japan)
       * - lhr1 (London, United Kingdom)
       * - pdx1 (Portland, USA)
       * - sfo1 (San Francisco, USA)
       * - sin1 (Singapore)
       * - syd1 (Sydney, Australia)
       * - dev1 (Development Region)
       *
       * @example "iad1"
       */
      VERCEL_REGION: get(env, "VERCEL_REGION"),
      /**
       * The unique identifier for the deployment, which can be used to implement Skew Protection.
       * @example "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3"
       */
      VERCEL_DEPLOYMENT_ID: get(env, "VERCEL_DEPLOYMENT_ID"),
      /**
       * When Skew Protection is enabled in Project Settings, this value is set to 1.
       * @example "1"
       */
      VERCEL_SKEW_PROTECTION_ENABLED: get(env, "VERCEL_SKEW_PROTECTION_ENABLED"),
      /**
       * The Protection Bypass for Automation value, if the secret has been generated in the project's Deployment Protection settings.
       */
      VERCEL_AUTOMATION_BYPASS_SECRET: get(env, "VERCEL_AUTOMATION_BYPASS_SECRET"),
      /**
       * The Git Provider the deployment is triggered from.
       * @example "github"
       */
      VERCEL_GIT_PROVIDER: get(env, "VERCEL_GIT_PROVIDER"),
      /**
       * The origin repository the deployment is triggered from.
       * @example "my-site"
       */
      VERCEL_GIT_REPO_SLUG: get(env, "VERCEL_GIT_REPO_SLUG"),
      /**
       * The account that owns the repository the deployment is triggered from.
       * @example "acme"
       */
      VERCEL_GIT_REPO_OWNER: get(env, "VERCEL_GIT_REPO_OWNER"),
      /**
       * The ID of the repository the deployment is triggered from.
       * @example "117716146"
       */
      VERCEL_GIT_REPO_ID: get(env, "VERCEL_GIT_REPO_ID"),
      /**
       * The git branch of the commit the deployment was triggered by.
       * @example "improve-about-page"
       */
      VERCEL_GIT_COMMIT_REF: get(env, "VERCEL_GIT_COMMIT_REF"),
      /**
       * The git SHA of the commit the deployment was triggered by.
       * @example "fa1eade47b73733d6312d5abfad33ce9e4068081"
       */
      VERCEL_GIT_COMMIT_SHA: get(env, "VERCEL_GIT_COMMIT_SHA"),
      /**
       * The message attached to the commit the deployment was triggered by.
       * @example "Update about page"
       */
      VERCEL_GIT_COMMIT_MESSAGE: get(env, "VERCEL_GIT_COMMIT_MESSAGE"),
      /**
       * The username attached to the author of the commit that the project was deployed by.
       * @example "johndoe"
       */
      VERCEL_GIT_COMMIT_AUTHOR_LOGIN: get(env, "VERCEL_GIT_COMMIT_AUTHOR_LOGIN"),
      /**
       * The name attached to the author of the commit that the project was deployed by.
       * @example "John Doe"
       */
      VERCEL_GIT_COMMIT_AUTHOR_NAME: get(env, "VERCEL_GIT_COMMIT_AUTHOR_NAME"),
      /**
       * The git SHA of the last successful deployment for the project and branch.
       * NOTE: This Variable is only exposed when an Ignored Build Step is provided.
       * @example "fa1eade47b73733d6312d5abfad33ce9e4068080"
       */
      VERCEL_GIT_PREVIOUS_SHA: get(env, "VERCEL_GIT_PREVIOUS_SHA"),
      /**
       * The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.
       * @example "23"
       */
      VERCEL_GIT_PULL_REQUEST_ID: get(env, "VERCEL_GIT_PULL_REQUEST_ID")
    });
    var get = (env, key2) => {
      const value = env[key2];
      return value === "" ? void 0 : value;
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/get-context.js
var require_get_context = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/get-context.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var get_context_exports = {};
    __export2(get_context_exports, {
      SYMBOL_FOR_REQ_CONTEXT: () => SYMBOL_FOR_REQ_CONTEXT,
      getContext: () => getContext
    });
    module.exports = __toCommonJS(get_context_exports);
    var SYMBOL_FOR_REQ_CONTEXT = /* @__PURE__ */ Symbol.for("@vercel/request-context");
    function getContext() {
      const fromSymbol = globalThis;
      return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/deadline.js
var require_deadline = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/deadline.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var deadline_exports = {};
    __export2(deadline_exports, {
      getDeadline: () => getDeadline2
    });
    module.exports = __toCommonJS(deadline_exports);
    var import_get_context = require_get_context();
    function getDeadline2() {
      const deadline = (0, import_get_context.getContext)().deadline;
      if (deadline === void 0) {
        return void 0;
      }
      const date = new Date(deadline);
      if (isNaN(date.getTime())) {
        return void 0;
      }
      return date;
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/wait-until.js
var require_wait_until = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/wait-until.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var wait_until_exports = {};
    __export2(wait_until_exports, {
      waitUntil: () => waitUntil2
    });
    module.exports = __toCommonJS(wait_until_exports);
    var import_get_context = require_get_context();
    var waitUntil2 = (promise) => {
      if (promise === null || typeof promise !== "object" || typeof promise.then !== "function") {
        throw new TypeError(
          `waitUntil can only be called with a Promise, got ${typeof promise}`
        );
      }
      return (0, import_get_context.getContext)().waitUntil?.(promise);
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/metric.js
var require_metric = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/metric.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var metric_exports = {};
    __export2(metric_exports, {
      metric: () => metric2
    });
    module.exports = __toCommonJS(metric_exports);
    var RUSTY_RUNTIME_IPC_SYMBOL = /* @__PURE__ */ Symbol.for("@vercel/rusty-runtime-ipc");
    function metric2(name, value, tags) {
      const ipc = globalThis[RUSTY_RUNTIME_IPC_SYMBOL];
      ipc?.sendMetric?.(name, value, tags);
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/middleware.js
var require_middleware = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/middleware.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var middleware_exports = {};
    __export2(middleware_exports, {
      next: () => next2,
      rewrite: () => rewrite2
    });
    module.exports = __toCommonJS(middleware_exports);
    function handleMiddlewareField(init, headers) {
      if (init?.request?.headers) {
        if (!(init.request.headers instanceof Headers)) {
          throw new Error("request.headers must be an instance of Headers");
        }
        const keys = [];
        for (const [key2, value] of init.request.headers) {
          headers.set("x-middleware-request-" + key2, value);
          keys.push(key2);
        }
        headers.set("x-middleware-override-headers", keys.join(","));
      }
    }
    function rewrite2(destination, init) {
      const headers = new Headers(init?.headers ?? {});
      headers.set("x-middleware-rewrite", String(destination));
      handleMiddlewareField(init, headers);
      return new Response(null, {
        ...init,
        headers
      });
    }
    function next2(init) {
      const headers = new Headers(init?.headers ?? {});
      headers.set("x-middleware-next", "1");
      handleMiddlewareField(init, headers);
      return new Response(null, {
        ...init,
        headers
      });
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/cache/in-memory-cache.js
var require_in_memory_cache = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/cache/in-memory-cache.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var in_memory_cache_exports = {};
    __export2(in_memory_cache_exports, {
      InMemoryCache: () => InMemoryCache
    });
    module.exports = __toCommonJS(in_memory_cache_exports);
    var InMemoryCache = class {
      constructor() {
        this.cache = {};
      }
      async get(key2) {
        const entry = this.cache[key2];
        if (entry) {
          if (entry.ttl && entry.lastModified + entry.ttl * 1e3 < Date.now()) {
            await this.delete(key2);
            return null;
          }
          return JSON.parse(entry.value);
        }
        return null;
      }
      async set(key2, value, options) {
        const serialized = JSON.stringify(value ?? null);
        this.cache[key2] = {
          value: serialized,
          lastModified: Date.now(),
          ttl: options?.ttl,
          tags: new Set(options?.tags || [])
        };
      }
      async delete(key2) {
        delete this.cache[key2];
      }
      async expireTag(tag) {
        const tags = Array.isArray(tag) ? tag : [tag];
        for (const key2 in this.cache) {
          if (Object.prototype.hasOwnProperty.call(this.cache, key2)) {
            const entry = this.cache[key2];
            if (tags.some((t) => entry.tags.has(t))) {
              delete this.cache[key2];
            }
          }
        }
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/cache/build-client.js
var require_build_client = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/cache/build-client.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var build_client_exports = {};
    __export2(build_client_exports, {
      BuildCache: () => BuildCache
    });
    module.exports = __toCommonJS(build_client_exports);
    var import_index = require_cache();
    var BuildCache = class {
      constructor({
        endpoint,
        headers,
        onError,
        timeout = 500
      }) {
        this.get = async (key2) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          try {
            const res = await fetch(`${this.endpoint}${key2}`, {
              headers: this.headers,
              method: "GET",
              signal: controller.signal
            });
            if (res.status === 404) {
              clearTimeout(timeoutId);
              return null;
            }
            if (res.status === 200) {
              const cacheState = res.headers.get(
                import_index.HEADERS_VERCEL_CACHE_STATE
              );
              if (cacheState !== import_index.PkgCacheState.Fresh) {
                res.body?.cancel?.();
                clearTimeout(timeoutId);
                return null;
              }
              const result = await res.json();
              clearTimeout(timeoutId);
              return result;
            } else {
              clearTimeout(timeoutId);
              throw new Error(`Failed to get cache: ${res.statusText}`);
            }
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
              const timeoutError = new Error(
                `Cache request timed out after ${this.timeout}ms`
              );
              timeoutError.stack = error.stack;
              this.onError?.(timeoutError);
            } else {
              this.onError?.(error);
            }
            return null;
          }
        };
        this.set = async (key2, value, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          try {
            const optionalHeaders = {};
            if (options?.ttl) {
              optionalHeaders[import_index.HEADERS_VERCEL_REVALIDATE] = options.ttl.toString();
            }
            if (options?.tags && options.tags.length > 0) {
              optionalHeaders[import_index.HEADERS_VERCEL_CACHE_TAGS] = options.tags.join(",");
            }
            if (options?.name) {
              optionalHeaders[import_index.HEADERS_VERCEL_CACHE_ITEM_NAME] = options.name;
            }
            const res = await fetch(`${this.endpoint}${key2}`, {
              method: "POST",
              headers: {
                ...this.headers,
                ...optionalHeaders
              },
              body: JSON.stringify(value),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.status !== 200) {
              throw new Error(`Failed to set cache: ${res.status} ${res.statusText}`);
            }
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
              const timeoutError = new Error(
                `Cache request timed out after ${this.timeout}ms`
              );
              timeoutError.stack = error.stack;
              this.onError?.(timeoutError);
            } else {
              this.onError?.(error);
            }
          }
        };
        this.delete = async (key2) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          try {
            const res = await fetch(`${this.endpoint}${key2}`, {
              method: "DELETE",
              headers: this.headers,
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.status !== 200) {
              throw new Error(`Failed to delete cache: ${res.statusText}`);
            }
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
              const timeoutError = new Error(
                `Cache request timed out after ${this.timeout}ms`
              );
              timeoutError.stack = error.stack;
              this.onError?.(timeoutError);
            } else {
              this.onError?.(error);
            }
          }
        };
        this.expireTag = async (tag) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          try {
            if (Array.isArray(tag)) {
              tag = tag.join(",");
            }
            const res = await fetch(`${this.endpoint}revalidate?tags=${tag}`, {
              method: "POST",
              headers: this.headers,
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.status !== 200) {
              throw new Error(`Failed to revalidate tag: ${res.statusText}`);
            }
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
              const timeoutError = new Error(
                `Cache request timed out after ${this.timeout}ms`
              );
              timeoutError.stack = error.stack;
              this.onError?.(timeoutError);
            } else {
              this.onError?.(error);
            }
          }
        };
        this.endpoint = endpoint;
        this.headers = headers;
        this.onError = onError;
        this.timeout = timeout;
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/cache/index.js
var require_cache = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/cache/index.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var cache_exports = {};
    __export2(cache_exports, {
      HEADERS_VERCEL_CACHE_ITEM_NAME: () => HEADERS_VERCEL_CACHE_ITEM_NAME,
      HEADERS_VERCEL_CACHE_STATE: () => HEADERS_VERCEL_CACHE_STATE,
      HEADERS_VERCEL_CACHE_TAGS: () => HEADERS_VERCEL_CACHE_TAGS,
      HEADERS_VERCEL_REVALIDATE: () => HEADERS_VERCEL_REVALIDATE,
      PkgCacheState: () => PkgCacheState,
      getCache: () => getCache2
    });
    module.exports = __toCommonJS(cache_exports);
    var import_get_context = require_get_context();
    var import_in_memory_cache = require_in_memory_cache();
    var import_build_client = require_build_client();
    var defaultKeyHashFunction = (key2) => {
      let hash2 = 5381;
      for (let i = 0; i < key2.length; i++) {
        hash2 = hash2 * 33 ^ key2.charCodeAt(i);
      }
      return (hash2 >>> 0).toString(16);
    };
    var defaultNamespaceSeparator = "$";
    var inMemoryCacheInstance = null;
    var buildCacheInstance = null;
    var getCache2 = (cacheOptions) => {
      const resolveCache = () => {
        let cache2;
        if ((0, import_get_context.getContext)().cache) {
          cache2 = (0, import_get_context.getContext)().cache;
        } else {
          cache2 = getCacheImplementation(
            process.env.SUSPENSE_CACHE_DEBUG === "true"
          );
        }
        return cache2;
      };
      return wrapWithKeyTransformation(
        resolveCache,
        createKeyTransformer(cacheOptions)
      );
    };
    function createKeyTransformer(cacheOptions) {
      const hashFunction = cacheOptions?.keyHashFunction || defaultKeyHashFunction;
      return (key2) => {
        if (!cacheOptions?.namespace)
          return hashFunction(key2);
        const separator = cacheOptions.namespaceSeparator || defaultNamespaceSeparator;
        return `${cacheOptions.namespace}${separator}${hashFunction(key2)}`;
      };
    }
    function wrapWithKeyTransformation(resolveCache, makeKey) {
      return {
        get: (key2) => {
          return resolveCache().get(makeKey(key2));
        },
        set: (key2, value, options) => {
          return resolveCache().set(makeKey(key2), value, {
            ...options,
            name: options?.name ?? key2
          });
        },
        delete: (key2) => {
          return resolveCache().delete(makeKey(key2));
        },
        expireTag: (tag) => {
          return resolveCache().expireTag(tag);
        }
      };
    }
    var warnedCacheUnavailable = false;
    function getCacheImplementation(debug) {
      if (!inMemoryCacheInstance) {
        inMemoryCacheInstance = new import_in_memory_cache.InMemoryCache();
      }
      if (process.env.RUNTIME_CACHE_DISABLE_BUILD_CACHE === "true") {
        debug && console.log("Using InMemoryCache as build cache is disabled");
        return inMemoryCacheInstance;
      }
      const { RUNTIME_CACHE_ENDPOINT, RUNTIME_CACHE_HEADERS } = process.env;
      if (debug) {
        console.log("Runtime cache environment variables:", {
          RUNTIME_CACHE_ENDPOINT,
          RUNTIME_CACHE_HEADERS
        });
      }
      if (!RUNTIME_CACHE_ENDPOINT || !RUNTIME_CACHE_HEADERS) {
        if (!warnedCacheUnavailable) {
          console.warn(
            "Runtime Cache unavailable in this environment. Falling back to in-memory cache."
          );
          warnedCacheUnavailable = true;
        }
        return inMemoryCacheInstance;
      }
      if (!buildCacheInstance) {
        let parsedHeaders = {};
        try {
          parsedHeaders = JSON.parse(RUNTIME_CACHE_HEADERS);
        } catch (e) {
          console.error("Failed to parse RUNTIME_CACHE_HEADERS:", e);
          return inMemoryCacheInstance;
        }
        let timeout = 500;
        if (process.env.RUNTIME_CACHE_TIMEOUT) {
          const parsed = parseInt(process.env.RUNTIME_CACHE_TIMEOUT, 10);
          if (!isNaN(parsed) && parsed > 0) {
            timeout = parsed;
          } else {
            console.warn(
              `Invalid RUNTIME_CACHE_TIMEOUT value: "${process.env.RUNTIME_CACHE_TIMEOUT}". Using default: ${timeout}ms`
            );
          }
        }
        buildCacheInstance = new import_build_client.BuildCache({
          endpoint: RUNTIME_CACHE_ENDPOINT,
          headers: parsedHeaders,
          onError: (error) => console.error(error),
          timeout
        });
      }
      return buildCacheInstance;
    }
    var PkgCacheState = /* @__PURE__ */ ((PkgCacheState2) => {
      PkgCacheState2["Fresh"] = "fresh";
      PkgCacheState2["Stale"] = "stale";
      PkgCacheState2["Expired"] = "expired";
      PkgCacheState2["NotFound"] = "notFound";
      PkgCacheState2["Error"] = "error";
      return PkgCacheState2;
    })(PkgCacheState || {});
    var HEADERS_VERCEL_CACHE_STATE = "x-vercel-cache-state";
    var HEADERS_VERCEL_REVALIDATE = "x-vercel-revalidate";
    var HEADERS_VERCEL_CACHE_TAGS = "x-vercel-cache-tags";
    var HEADERS_VERCEL_CACHE_ITEM_NAME = "x-vercel-cache-item-name";
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/db-connections/index.js
var require_db_connections = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/db-connections/index.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var db_connections_exports = {};
    __export2(db_connections_exports, {
      attachDatabasePool: () => attachDatabasePool3,
      experimental_attachDatabasePool: () => experimental_attachDatabasePool2
    });
    module.exports = __toCommonJS(db_connections_exports);
    var import_get_context = require_get_context();
    var import_deadline = require_deadline();
    var DEBUG = !!process.env.DEBUG;
    function getIdleTimeout(dbPool) {
      if ("options" in dbPool && dbPool.options) {
        if ("idleTimeoutMillis" in dbPool.options) {
          return typeof dbPool.options.idleTimeoutMillis === "number" ? dbPool.options.idleTimeoutMillis : 1e4;
        }
        if ("maxIdleTimeMS" in dbPool.options) {
          return typeof dbPool.options.maxIdleTimeMS === "number" ? dbPool.options.maxIdleTimeMS : 0;
        }
        if ("status" in dbPool) {
          return 5e3;
        }
        if ("connect" in dbPool && "execute" in dbPool) {
          return 3e4;
        }
      }
      if ("config" in dbPool && dbPool.config) {
        if ("connectionConfig" in dbPool.config && dbPool.config.connectionConfig) {
          return dbPool.config.connectionConfig.idleTimeout || 6e4;
        }
        if ("idleTimeout" in dbPool.config) {
          return typeof dbPool.config.idleTimeout === "number" ? dbPool.config.idleTimeout : 6e4;
        }
      }
      if ("poolTimeout" in dbPool) {
        return typeof dbPool.poolTimeout === "number" ? dbPool.poolTimeout : 6e4;
      }
      if ("idleTimeout" in dbPool) {
        return typeof dbPool.idleTimeout === "number" ? dbPool.idleTimeout : 0;
      }
      return 1e4;
    }
    var idleTimeout = null;
    var idleTimeoutResolve = () => {
    };
    var maximumDuration = 15 * 60 * 1e3 - 1e3;
    function waitUntilIdleTimeout(dbPool) {
      if (!process.env.VERCEL_URL || // This is not set during builds where we don't need to wait for idle connections using the mechanism
      !process.env.VERCEL_REGION) {
        return;
      }
      if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeoutResolve();
      }
      const promise = new Promise((resolve) => {
        idleTimeoutResolve = resolve;
      });
      const deadline = (0, import_deadline.getDeadline)();
      const remainingDuration = deadline ? deadline.getTime() - Date.now() - 1e3 : maximumDuration;
      const waitTime = Math.min(
        getIdleTimeout(dbPool) + 100,
        Math.max(100, remainingDuration)
      );
      idleTimeout = setTimeout(() => {
        idleTimeoutResolve?.();
        if (DEBUG) {
          console.log("Database pool idle timeout reached. Releasing connections.");
        }
      }, waitTime);
      const requestContext = (0, import_get_context.getContext)();
      if (requestContext?.waitUntil) {
        requestContext.waitUntil(promise);
      } else {
        console.warn("Pool release event triggered outside of request scope.");
      }
    }
    function attachDatabasePool3(dbPool) {
      if (idleTimeout) {
        idleTimeoutResolve?.();
        clearTimeout(idleTimeout);
      }
      if ("on" in dbPool && dbPool.on && "options" in dbPool && "idleTimeoutMillis" in dbPool.options) {
        const pgPool = dbPool;
        pgPool.on("release", () => {
          if (DEBUG) {
            console.log("Client released from pool");
          }
          waitUntilIdleTimeout(dbPool);
        });
        return;
      } else if ("on" in dbPool && dbPool.on && "config" in dbPool && dbPool.config && "connectionConfig" in dbPool.config) {
        const mysqlPool = dbPool;
        mysqlPool.on("release", () => {
          if (DEBUG) {
            console.log("MySQL client released from pool");
          }
          waitUntilIdleTimeout(dbPool);
        });
        return;
      } else if ("on" in dbPool && dbPool.on && "config" in dbPool && dbPool.config && "idleTimeout" in dbPool.config) {
        const mysql2Pool = dbPool;
        mysql2Pool.on("release", () => {
          if (DEBUG) {
            console.log("MySQL2/MariaDB client released from pool");
          }
          waitUntilIdleTimeout(dbPool);
        });
        return;
      }
      if ("on" in dbPool && dbPool.on && "options" in dbPool && dbPool.options && "maxIdleTimeMS" in dbPool.options) {
        const mongoPool = dbPool;
        mongoPool.on("connectionCheckedOut", () => {
          if (DEBUG) {
            console.log("MongoDB connection checked out");
          }
          waitUntilIdleTimeout(dbPool);
        });
        return;
      }
      if ("on" in dbPool && dbPool.on && "options" in dbPool && dbPool.options && "socket" in dbPool.options) {
        const redisPool = dbPool;
        redisPool.on("end", () => {
          if (DEBUG) {
            console.log("Redis connection ended");
          }
          waitUntilIdleTimeout(dbPool);
        });
        return;
      }
      throw new Error("Unsupported database pool type");
    }
    var experimental_attachDatabasePool2 = attachDatabasePool3;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/purge/index.js
var require_purge = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/purge/index.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var purge_exports = {};
    __export2(purge_exports, {
      dangerouslyDeleteBySrcImage: () => dangerouslyDeleteBySrcImage2,
      dangerouslyDeleteByTag: () => dangerouslyDeleteByTag2,
      invalidateBySrcImage: () => invalidateBySrcImage2,
      invalidateByTag: () => invalidateByTag2
    });
    module.exports = __toCommonJS(purge_exports);
    var import_get_context = require_get_context();
    var invalidateByTag2 = (tag) => {
      const api = (0, import_get_context.getContext)().purge;
      if (api) {
        return api.invalidateByTag(tag);
      }
      return Promise.resolve();
    };
    var dangerouslyDeleteByTag2 = (tag, options) => {
      const api = (0, import_get_context.getContext)().purge;
      if (api) {
        return api.dangerouslyDeleteByTag(tag, options);
      }
      return Promise.resolve();
    };
    var invalidateBySrcImage2 = (src) => {
      const api = (0, import_get_context.getContext)().purge;
      return api ? api.invalidateBySrcImage(src) : Promise.resolve();
    };
    var dangerouslyDeleteBySrcImage2 = (src, options) => {
      const api = (0, import_get_context.getContext)().purge;
      return api ? api.dangerouslyDeleteBySrcImage(src, options) : Promise.resolve();
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/addcachetag/index.js
var require_addcachetag = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/addcachetag/index.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var addcachetag_exports = {};
    __export2(addcachetag_exports, {
      addCacheTag: () => addCacheTag2
    });
    module.exports = __toCommonJS(addcachetag_exports);
    var import_get_context = require_get_context();
    var addCacheTag2 = (tag) => {
      const addCacheTag22 = (0, import_get_context.getContext)().addCacheTag;
      if (addCacheTag22) {
        return addCacheTag22(tag);
      }
      return Promise.resolve();
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key2) => {
            let value = params[key2];
            if (value.length > 1) {
              throw new Error(`Parameter "${key2}" must have only a single value`);
            }
            value = value[0];
            if (key2 === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key2}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key2}": ${value}`
                );
              }
            } else if (key2 === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key2}": ${value}`
                );
              }
              value = num;
            } else if (key2 === "client_no_context_takeover" || key2 === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key2}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key2}"`);
            }
            params[key2] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key2 = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key2] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key2];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key2 = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key2] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key2];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          if (this._maxFragments > 0 && this._fragments.length >= this._maxFragments) {
            const error = this.createError(
              RangeError,
              "Too many message fragments",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            );
            cb(error);
            return;
          }
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            if (this._maxFragments > 0 && this._fragments.length >= this._maxFragments) {
              const error = this.createError(
                RangeError,
                "Too many message fragments",
                false,
                1008,
                "WS_ERR_TOO_MANY_BUFFERED_PARTS"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes, createHash: createHash5 } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address2, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address2 !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address2, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address2, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 1024 * 1024,
        maxFragments: 128 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address2 instanceof URL2) {
        parsedUrl = address2;
      } else {
        try {
          parsedUrl = new URL2(address2);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address2}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key2 = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key2,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key3, value] of Object.entries(headers)) {
              options.headers[key3.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr3;
          try {
            addr3 = new URL2(location, address2);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr3, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash5("sha1").update(key2 + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/stream.js
var require_stream2 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash: createHash5 } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=1048576] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=131072] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 1024 * 1024,
          maxFragments: 128 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key2 = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version3 = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key2 === void 0 || !keyRegex.test(key2)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version3 !== 13 && version3 !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version3 === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key2,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key2, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key2, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash5("sha1").update(key2 + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/ws/wrapper.mjs
var wrapper_exports = {};
__export(wrapper_exports, {
  PerMessageDeflate: () => import_permessage_deflate.default,
  Receiver: () => import_receiver.default,
  Sender: () => import_sender.default,
  WebSocket: () => import_websocket.default,
  WebSocketServer: () => import_websocket_server.default,
  createWebSocketStream: () => import_stream.default,
  default: () => wrapper_default,
  extension: () => import_extension.default,
  subprotocol: () => import_subprotocol.default
});
var import_stream, import_extension, import_permessage_deflate, import_receiver, import_sender, import_subprotocol, import_websocket, import_websocket_server, wrapper_default;
var init_wrapper = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/ws/wrapper.mjs"() {
    import_stream = __toESM(require_stream2(), 1);
    import_extension = __toESM(require_extension(), 1);
    import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
    import_receiver = __toESM(require_receiver(), 1);
    import_sender = __toESM(require_sender(), 1);
    import_subprotocol = __toESM(require_subprotocol(), 1);
    import_websocket = __toESM(require_websocket(), 1);
    import_websocket_server = __toESM(require_websocket_server(), 1);
    wrapper_default = import_websocket.default;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/websocket/index.js
var require_websocket2 = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/websocket/index.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var websocket_exports = {};
    __export2(websocket_exports, {
      experimental_upgradeWebSocket: () => experimental_upgradeWebSocket2,
      upgradeWebSocket: () => upgradeWebSocket2
    });
    module.exports = __toCommonJS(websocket_exports);
    var import_get_context = require_get_context();
    var DEFAULT_MAX_PAYLOAD = 256 * 1024;
    async function loadWebSocketServer() {
      try {
        const ws = await Promise.resolve().then(() => (init_wrapper(), wrapper_exports));
        return ws.WebSocketServer;
      } catch {
        throw new Error(
          'The "ws" package is required for upgradeWebSocket(). Install it with: npm install ws'
        );
      }
    }
    async function upgradeWebSocket2(handler, options = {}) {
      const ctx = (0, import_get_context.getContext)();
      if (typeof ctx.upgradeWebSocket !== "function") {
        throw new Error(
          "upgradeWebSocket is not available in the current runtime environment. This feature requires a Vercel runtime that supports WebSocket upgrades."
        );
      }
      const WebSocketServer2 = await loadWebSocketServer();
      const { req, socket, head } = ctx.upgradeWebSocket();
      const wss = new WebSocketServer2({
        noServer: true,
        maxPayload: options.maxPayload ?? DEFAULT_MAX_PAYLOAD
      });
      const ws = await new Promise((resolve, reject) => {
        const cleanup = () => {
          socket.removeListener("error", onError);
          socket.removeListener("close", onClose);
        };
        const rejectUpgrade = (err) => {
          cleanup();
          if (err instanceof Error) {
            reject(err);
            return;
          }
          const error = new Error("WebSocket upgrade failed");
          error.cause = err;
          reject(error);
        };
        const resolveUpgrade = (ws2) => {
          cleanup();
          resolve(ws2);
        };
        const onError = (err) => rejectUpgrade(err);
        const onClose = () => rejectUpgrade(
          new Error("socket closed before the WebSocket upgrade completed")
        );
        socket.once("error", onError);
        socket.once("close", onClose);
        try {
          wss.handleUpgrade(req, socket, head, resolveUpgrade);
        } catch (err) {
          rejectUpgrade(err);
        }
      });
      try {
        await handler(ws);
      } catch (err) {
        ws.close(1011, "WebSocket handler failed");
        throw err;
      }
      return new Response(null, { status: 204 });
    }
    var experimental_upgradeWebSocket2 = upgradeWebSocket2;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@vercel/functions/index.js
var require_functions = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@vercel/functions/index.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key2 of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key2) && key2 !== except)
            __defProp2(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc2(from, key2)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var src_exports = {};
    __export2(src_exports, {
      addCacheTag: () => import_addcachetag.addCacheTag,
      attachDatabasePool: () => import_db_connections.attachDatabasePool,
      dangerouslyDeleteBySrcImage: () => import_purge.dangerouslyDeleteBySrcImage,
      dangerouslyDeleteByTag: () => import_purge.dangerouslyDeleteByTag,
      experimental_attachDatabasePool: () => import_db_connections.experimental_attachDatabasePool,
      experimental_upgradeWebSocket: () => import_websocket2.experimental_upgradeWebSocket,
      geolocation: () => import_headers.geolocation,
      getCache: () => import_cache2.getCache,
      getDeadline: () => import_deadline.getDeadline,
      getEnv: () => import_get_env.getEnv,
      invalidateBySrcImage: () => import_purge.invalidateBySrcImage,
      invalidateByTag: () => import_purge.invalidateByTag,
      ipAddress: () => import_headers.ipAddress,
      metric: () => import_metric.metric,
      next: () => import_middleware.next,
      rewrite: () => import_middleware.rewrite,
      upgradeWebSocket: () => import_websocket2.upgradeWebSocket,
      waitUntil: () => import_wait_until.waitUntil
    });
    module.exports = __toCommonJS(src_exports);
    var import_headers = require_headers();
    var import_get_env = require_get_env();
    var import_deadline = require_deadline();
    var import_wait_until = require_wait_until();
    var import_metric = require_metric();
    var import_middleware = require_middleware();
    var import_cache2 = require_cache();
    var import_db_connections = require_db_connections();
    var import_purge = require_purge();
    var import_addcachetag = require_addcachetag();
    var import_websocket2 = require_websocket2();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/version.js
var version;
var init_version = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/version.js"() {
    version = "1.2.3";
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/errors.js
var BaseError;
var init_errors = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/errors.js"() {
    init_version();
    BaseError = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = args.cause instanceof _BaseError ? args.cause.details : args.cause?.message ? args.cause.message : args.details;
        const docsPath3 = args.cause instanceof _BaseError ? args.cause.docsPath || args.docsPath : args.docsPath;
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsPath3 ? [`Docs: https://abitype.dev${docsPath3}`] : [],
          ...details ? [`Details: ${details}`] : [],
          `Version: abitype@${version}`
        ].join("\n");
        super(message);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "AbiTypeError"
        });
        if (args.cause)
          this.cause = args.cause;
        this.details = details;
        this.docsPath = docsPath3;
        this.metaMessages = args.metaMessages;
        this.shortMessage = shortMessage;
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/regex.js
function execTyped(regex, string) {
  const match = regex.exec(string);
  return match?.groups;
}
var bytesRegex, integerRegex, isTupleRegex;
var init_regex = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/regex.js"() {
    bytesRegex = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/;
    integerRegex = /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;
    isTupleRegex = /^\(.+?\).*?$/;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/formatAbiParameter.js
function formatAbiParameter(abiParameter) {
  let type = abiParameter.type;
  if (tupleRegex.test(abiParameter.type) && "components" in abiParameter) {
    type = "(";
    const length = abiParameter.components.length;
    for (let i = 0; i < length; i++) {
      const component = abiParameter.components[i];
      type += formatAbiParameter(component);
      if (i < length - 1)
        type += ", ";
    }
    const result = execTyped(tupleRegex, abiParameter.type);
    type += `)${result?.array || ""}`;
    return formatAbiParameter({
      ...abiParameter,
      type
    });
  }
  if ("indexed" in abiParameter && abiParameter.indexed)
    type = `${type} indexed`;
  if (abiParameter.name)
    return `${type} ${abiParameter.name}`;
  return type;
}
var tupleRegex;
var init_formatAbiParameter = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/formatAbiParameter.js"() {
    init_regex();
    tupleRegex = /^tuple(?<array>(\[(\d*)\])*)$/;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/formatAbiParameters.js
function formatAbiParameters(abiParameters) {
  let params = "";
  const length = abiParameters.length;
  for (let i = 0; i < length; i++) {
    const abiParameter = abiParameters[i];
    params += formatAbiParameter(abiParameter);
    if (i !== length - 1)
      params += ", ";
  }
  return params;
}
var init_formatAbiParameters = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/formatAbiParameters.js"() {
    init_formatAbiParameter();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/formatAbiItem.js
function formatAbiItem(abiItem) {
  if (abiItem.type === "function")
    return `function ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})${abiItem.stateMutability && abiItem.stateMutability !== "nonpayable" ? ` ${abiItem.stateMutability}` : ""}${abiItem.outputs?.length ? ` returns (${formatAbiParameters(abiItem.outputs)})` : ""}`;
  if (abiItem.type === "event")
    return `event ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})`;
  if (abiItem.type === "error")
    return `error ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})`;
  if (abiItem.type === "constructor")
    return `constructor(${formatAbiParameters(abiItem.inputs)})${abiItem.stateMutability === "payable" ? " payable" : ""}`;
  if (abiItem.type === "fallback")
    return `fallback() external${abiItem.stateMutability === "payable" ? " payable" : ""}`;
  return "receive() external payable";
}
var init_formatAbiItem = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/formatAbiItem.js"() {
    init_formatAbiParameters();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/signatures.js
function isErrorSignature(signature) {
  return errorSignatureRegex.test(signature);
}
function execErrorSignature(signature) {
  return execTyped(errorSignatureRegex, signature);
}
function isEventSignature(signature) {
  return eventSignatureRegex.test(signature);
}
function execEventSignature(signature) {
  return execTyped(eventSignatureRegex, signature);
}
function isFunctionSignature(signature) {
  return functionSignatureRegex.test(signature);
}
function execFunctionSignature(signature) {
  return execTyped(functionSignatureRegex, signature);
}
function isStructSignature(signature) {
  return structSignatureRegex.test(signature);
}
function execStructSignature(signature) {
  return execTyped(structSignatureRegex, signature);
}
function isConstructorSignature(signature) {
  return constructorSignatureRegex.test(signature);
}
function execConstructorSignature(signature) {
  return execTyped(constructorSignatureRegex, signature);
}
function isFallbackSignature(signature) {
  return fallbackSignatureRegex.test(signature);
}
function execFallbackSignature(signature) {
  return execTyped(fallbackSignatureRegex, signature);
}
function isReceiveSignature(signature) {
  return receiveSignatureRegex.test(signature);
}
var errorSignatureRegex, eventSignatureRegex, functionSignatureRegex, structSignatureRegex, constructorSignatureRegex, fallbackSignatureRegex, receiveSignatureRegex, eventModifiers, functionModifiers;
var init_signatures = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/signatures.js"() {
    init_regex();
    errorSignatureRegex = /^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
    eventSignatureRegex = /^event (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
    functionSignatureRegex = /^function (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns\s?\((?<returns>.*?)\))?$/;
    structSignatureRegex = /^struct (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*) \{(?<properties>.*?)\}$/;
    constructorSignatureRegex = /^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/;
    fallbackSignatureRegex = /^fallback\(\) external(?:\s(?<stateMutability>payable{1}))?$/;
    receiveSignatureRegex = /^receive\(\) external payable$/;
    eventModifiers = /* @__PURE__ */ new Set(["indexed"]);
    functionModifiers = /* @__PURE__ */ new Set([
      "calldata",
      "memory",
      "storage"
    ]);
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/abiItem.js
var UnknownTypeError, UnknownSolidityTypeError;
var init_abiItem = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/abiItem.js"() {
    init_errors();
    UnknownTypeError = class extends BaseError {
      constructor({ type }) {
        super("Unknown type.", {
          metaMessages: [
            `Type "${type}" is not a valid ABI type. Perhaps you forgot to include a struct signature?`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownTypeError"
        });
      }
    };
    UnknownSolidityTypeError = class extends BaseError {
      constructor({ type }) {
        super("Unknown type.", {
          metaMessages: [`Type "${type}" is not a valid ABI type.`]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownSolidityTypeError"
        });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/abiParameter.js
var InvalidParameterError, SolidityProtectedKeywordError, InvalidModifierError, InvalidFunctionModifierError, InvalidAbiTypeParameterError;
var init_abiParameter = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/abiParameter.js"() {
    init_errors();
    InvalidParameterError = class extends BaseError {
      constructor({ param }) {
        super("Invalid ABI parameter.", {
          details: param
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidParameterError"
        });
      }
    };
    SolidityProtectedKeywordError = class extends BaseError {
      constructor({ param, name }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `"${name}" is a protected Solidity keyword. More info: https://docs.soliditylang.org/en/latest/cheatsheet.html`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "SolidityProtectedKeywordError"
        });
      }
    };
    InvalidModifierError = class extends BaseError {
      constructor({ param, type, modifier }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ""}.`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidModifierError"
        });
      }
    };
    InvalidFunctionModifierError = class extends BaseError {
      constructor({ param, type, modifier }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ""}.`,
            `Data location can only be specified for array, struct, or mapping types, but "${modifier}" was given.`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidFunctionModifierError"
        });
      }
    };
    InvalidAbiTypeParameterError = class extends BaseError {
      constructor({ abiParameter }) {
        super("Invalid ABI parameter.", {
          details: JSON.stringify(abiParameter, null, 2),
          metaMessages: ["ABI parameter type is invalid."]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidAbiTypeParameterError"
        });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/signature.js
var InvalidSignatureError, UnknownSignatureError, InvalidStructSignatureError;
var init_signature = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/signature.js"() {
    init_errors();
    InvalidSignatureError = class extends BaseError {
      constructor({ signature, type }) {
        super(`Invalid ${type} signature.`, {
          details: signature
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidSignatureError"
        });
      }
    };
    UnknownSignatureError = class extends BaseError {
      constructor({ signature }) {
        super("Unknown signature.", {
          details: signature
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownSignatureError"
        });
      }
    };
    InvalidStructSignatureError = class extends BaseError {
      constructor({ signature }) {
        super("Invalid struct signature.", {
          details: signature,
          metaMessages: ["No properties exist."]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidStructSignatureError"
        });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/struct.js
var CircularReferenceError;
var init_struct = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/struct.js"() {
    init_errors();
    CircularReferenceError = class extends BaseError {
      constructor({ type }) {
        super("Circular reference detected.", {
          metaMessages: [`Struct "${type}" is a circular reference.`]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "CircularReferenceError"
        });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/splitParameters.js
var InvalidParenthesisError;
var init_splitParameters = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/errors/splitParameters.js"() {
    init_errors();
    InvalidParenthesisError = class extends BaseError {
      constructor({ current, depth }) {
        super("Unbalanced parentheses.", {
          metaMessages: [
            `"${current.trim()}" has too many ${depth > 0 ? "opening" : "closing"} parentheses.`
          ],
          details: `Depth "${depth}"`
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidParenthesisError"
        });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/cache.js
function getParameterCacheKey(param, type, structs) {
  let structKey = "";
  if (structs)
    for (const struct of Object.entries(structs)) {
      if (!struct)
        continue;
      let propertyKey = "";
      for (const property of struct[1]) {
        propertyKey += `[${property.type}${property.name ? `:${property.name}` : ""}]`;
      }
      structKey += `(${struct[0]}{${propertyKey}})`;
    }
  if (type)
    return `${type}:${param}${structKey}`;
  return `${param}${structKey}`;
}
var parameterCache;
var init_cache = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/cache.js"() {
    parameterCache = /* @__PURE__ */ new Map([
      // Unnamed
      ["address", { type: "address" }],
      ["bool", { type: "bool" }],
      ["bytes", { type: "bytes" }],
      ["bytes32", { type: "bytes32" }],
      ["int", { type: "int256" }],
      ["int256", { type: "int256" }],
      ["string", { type: "string" }],
      ["uint", { type: "uint256" }],
      ["uint8", { type: "uint8" }],
      ["uint16", { type: "uint16" }],
      ["uint24", { type: "uint24" }],
      ["uint32", { type: "uint32" }],
      ["uint64", { type: "uint64" }],
      ["uint96", { type: "uint96" }],
      ["uint112", { type: "uint112" }],
      ["uint160", { type: "uint160" }],
      ["uint192", { type: "uint192" }],
      ["uint256", { type: "uint256" }],
      // Named
      ["address owner", { type: "address", name: "owner" }],
      ["address to", { type: "address", name: "to" }],
      ["bool approved", { type: "bool", name: "approved" }],
      ["bytes _data", { type: "bytes", name: "_data" }],
      ["bytes data", { type: "bytes", name: "data" }],
      ["bytes signature", { type: "bytes", name: "signature" }],
      ["bytes32 hash", { type: "bytes32", name: "hash" }],
      ["bytes32 r", { type: "bytes32", name: "r" }],
      ["bytes32 root", { type: "bytes32", name: "root" }],
      ["bytes32 s", { type: "bytes32", name: "s" }],
      ["string name", { type: "string", name: "name" }],
      ["string symbol", { type: "string", name: "symbol" }],
      ["string tokenURI", { type: "string", name: "tokenURI" }],
      ["uint tokenId", { type: "uint256", name: "tokenId" }],
      ["uint8 v", { type: "uint8", name: "v" }],
      ["uint256 balance", { type: "uint256", name: "balance" }],
      ["uint256 tokenId", { type: "uint256", name: "tokenId" }],
      ["uint256 value", { type: "uint256", name: "value" }],
      // Indexed
      [
        "event:address indexed from",
        { type: "address", name: "from", indexed: true }
      ],
      ["event:address indexed to", { type: "address", name: "to", indexed: true }],
      [
        "event:uint indexed tokenId",
        { type: "uint256", name: "tokenId", indexed: true }
      ],
      [
        "event:uint256 indexed tokenId",
        { type: "uint256", name: "tokenId", indexed: true }
      ]
    ]);
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/utils.js
function parseSignature(signature, structs = {}) {
  if (isFunctionSignature(signature))
    return parseFunctionSignature(signature, structs);
  if (isEventSignature(signature))
    return parseEventSignature(signature, structs);
  if (isErrorSignature(signature))
    return parseErrorSignature(signature, structs);
  if (isConstructorSignature(signature))
    return parseConstructorSignature(signature, structs);
  if (isFallbackSignature(signature))
    return parseFallbackSignature(signature);
  if (isReceiveSignature(signature))
    return {
      type: "receive",
      stateMutability: "payable"
    };
  throw new UnknownSignatureError({ signature });
}
function parseFunctionSignature(signature, structs = {}) {
  const match = execFunctionSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "function" });
  const inputParams = splitParameters(match.parameters);
  const inputs = [];
  const inputLength = inputParams.length;
  for (let i = 0; i < inputLength; i++) {
    inputs.push(parseAbiParameter(inputParams[i], {
      modifiers: functionModifiers,
      structs,
      type: "function"
    }));
  }
  const outputs = [];
  if (match.returns) {
    const outputParams = splitParameters(match.returns);
    const outputLength = outputParams.length;
    for (let i = 0; i < outputLength; i++) {
      outputs.push(parseAbiParameter(outputParams[i], {
        modifiers: functionModifiers,
        structs,
        type: "function"
      }));
    }
  }
  return {
    name: match.name,
    type: "function",
    stateMutability: match.stateMutability ?? "nonpayable",
    inputs,
    outputs
  };
}
function parseEventSignature(signature, structs = {}) {
  const match = execEventSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "event" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], {
      modifiers: eventModifiers,
      structs,
      type: "event"
    }));
  return { name: match.name, type: "event", inputs: abiParameters };
}
function parseErrorSignature(signature, structs = {}) {
  const match = execErrorSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "error" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], { structs, type: "error" }));
  return { name: match.name, type: "error", inputs: abiParameters };
}
function parseConstructorSignature(signature, structs = {}) {
  const match = execConstructorSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "constructor" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], { structs, type: "constructor" }));
  return {
    type: "constructor",
    stateMutability: match.stateMutability ?? "nonpayable",
    inputs: abiParameters
  };
}
function parseFallbackSignature(signature) {
  const match = execFallbackSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "fallback" });
  return {
    type: "fallback",
    stateMutability: match.stateMutability ?? "nonpayable"
  };
}
function parseAbiParameter(param, options) {
  const parameterCacheKey = getParameterCacheKey(param, options?.type, options?.structs);
  if (parameterCache.has(parameterCacheKey))
    return parameterCache.get(parameterCacheKey);
  const isTuple = isTupleRegex.test(param);
  const match = execTyped(isTuple ? abiParameterWithTupleRegex : abiParameterWithoutTupleRegex, param);
  if (!match)
    throw new InvalidParameterError({ param });
  if (match.name && isSolidityKeyword(match.name))
    throw new SolidityProtectedKeywordError({ param, name: match.name });
  const name = match.name ? { name: match.name } : {};
  const indexed = match.modifier === "indexed" ? { indexed: true } : {};
  const structs = options?.structs ?? {};
  let type;
  let components = {};
  if (isTuple) {
    type = "tuple";
    const params = splitParameters(match.type);
    const components_ = [];
    const length = params.length;
    for (let i = 0; i < length; i++) {
      components_.push(parseAbiParameter(params[i], { structs }));
    }
    components = { components: components_ };
  } else if (match.type in structs) {
    type = "tuple";
    components = { components: structs[match.type] };
  } else if (dynamicIntegerRegex.test(match.type)) {
    type = `${match.type}256`;
  } else if (match.type === "address payable") {
    type = "address";
  } else {
    type = match.type;
    if (!(options?.type === "struct") && !isSolidityType(type))
      throw new UnknownSolidityTypeError({ type });
  }
  if (match.modifier) {
    if (!options?.modifiers?.has?.(match.modifier))
      throw new InvalidModifierError({
        param,
        type: options?.type,
        modifier: match.modifier
      });
    if (functionModifiers.has(match.modifier) && !isValidDataLocation(type, !!match.array))
      throw new InvalidFunctionModifierError({
        param,
        type: options?.type,
        modifier: match.modifier
      });
  }
  const abiParameter = {
    type: `${type}${match.array ?? ""}`,
    ...name,
    ...indexed,
    ...components
  };
  parameterCache.set(parameterCacheKey, abiParameter);
  return abiParameter;
}
function splitParameters(params, result = [], current = "", depth = 0) {
  const length = params.trim().length;
  for (let i = 0; i < length; i++) {
    const char = params[i];
    const tail = params.slice(i + 1);
    switch (char) {
      case ",":
        return depth === 0 ? splitParameters(tail, [...result, current.trim()]) : splitParameters(tail, result, `${current}${char}`, depth);
      case "(":
        return splitParameters(tail, result, `${current}${char}`, depth + 1);
      case ")":
        return splitParameters(tail, result, `${current}${char}`, depth - 1);
      default:
        return splitParameters(tail, result, `${current}${char}`, depth);
    }
  }
  if (current === "")
    return result;
  if (depth !== 0)
    throw new InvalidParenthesisError({ current, depth });
  result.push(current.trim());
  return result;
}
function isSolidityType(type) {
  return type === "address" || type === "bool" || type === "function" || type === "string" || bytesRegex.test(type) || integerRegex.test(type);
}
function isSolidityKeyword(name) {
  return name === "address" || name === "bool" || name === "function" || name === "string" || name === "tuple" || bytesRegex.test(name) || integerRegex.test(name) || protectedKeywordsRegex.test(name);
}
function isValidDataLocation(type, isArray) {
  return isArray || type === "bytes" || type === "string" || type === "tuple";
}
var abiParameterWithoutTupleRegex, abiParameterWithTupleRegex, dynamicIntegerRegex, protectedKeywordsRegex;
var init_utils = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/utils.js"() {
    init_regex();
    init_abiItem();
    init_abiParameter();
    init_signature();
    init_splitParameters();
    init_cache();
    init_signatures();
    abiParameterWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*(?:\spayable)?)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
    abiParameterWithTupleRegex = /^\((?<type>.+?)\)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
    dynamicIntegerRegex = /^u?int$/;
    protectedKeywordsRegex = /^(?:after|alias|anonymous|apply|auto|byte|calldata|case|catch|constant|copyof|default|defined|error|event|external|false|final|function|immutable|implements|in|indexed|inline|internal|let|mapping|match|memory|mutable|null|of|override|partial|private|promise|public|pure|reference|relocatable|return|returns|sizeof|static|storage|struct|super|supports|switch|this|true|try|typedef|typeof|var|view|virtual)$/;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/structs.js
function parseStructs(signatures) {
  const shallowStructs = {};
  const signaturesLength = signatures.length;
  for (let i = 0; i < signaturesLength; i++) {
    const signature = signatures[i];
    if (!isStructSignature(signature))
      continue;
    const match = execStructSignature(signature);
    if (!match)
      throw new InvalidSignatureError({ signature, type: "struct" });
    const properties = match.properties.split(";");
    const components = [];
    const propertiesLength = properties.length;
    for (let k = 0; k < propertiesLength; k++) {
      const property = properties[k];
      const trimmed = property.trim();
      if (!trimmed)
        continue;
      const abiParameter = parseAbiParameter(trimmed, {
        type: "struct"
      });
      components.push(abiParameter);
    }
    if (!components.length)
      throw new InvalidStructSignatureError({ signature });
    shallowStructs[match.name] = components;
  }
  const resolvedStructs = {};
  const entries = Object.entries(shallowStructs);
  const entriesLength = entries.length;
  for (let i = 0; i < entriesLength; i++) {
    const [name, parameters] = entries[i];
    resolvedStructs[name] = resolveStructs(parameters, shallowStructs);
  }
  return resolvedStructs;
}
function resolveStructs(abiParameters = [], structs = {}, ancestors = /* @__PURE__ */ new Set()) {
  const components = [];
  const length = abiParameters.length;
  for (let i = 0; i < length; i++) {
    const abiParameter = abiParameters[i];
    const isTuple = isTupleRegex.test(abiParameter.type);
    if (isTuple)
      components.push(abiParameter);
    else {
      const match = execTyped(typeWithoutTupleRegex, abiParameter.type);
      if (!match?.type)
        throw new InvalidAbiTypeParameterError({ abiParameter });
      const { array, type } = match;
      if (type in structs) {
        if (ancestors.has(type))
          throw new CircularReferenceError({ type });
        components.push({
          ...abiParameter,
          type: `tuple${array ?? ""}`,
          components: resolveStructs(structs[type], structs, /* @__PURE__ */ new Set([...ancestors, type]))
        });
      } else {
        if (isSolidityType(type))
          components.push(abiParameter);
        else
          throw new UnknownTypeError({ type });
      }
    }
  }
  return components;
}
var typeWithoutTupleRegex;
var init_structs = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/runtime/structs.js"() {
    init_regex();
    init_abiItem();
    init_abiParameter();
    init_signature();
    init_struct();
    init_signatures();
    init_utils();
    typeWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*)(?<array>(?:\[\d*?\])+?)?$/;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/parseAbi.js
function parseAbi(signatures) {
  const structs = parseStructs(signatures);
  const abi = [];
  const length = signatures.length;
  for (let i = 0; i < length; i++) {
    const signature = signatures[i];
    if (isStructSignature(signature))
      continue;
    abi.push(parseSignature(signature, structs));
  }
  return abi;
}
var init_parseAbi = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/human-readable/parseAbi.js"() {
    init_signatures();
    init_structs();
    init_utils();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/abitype/dist/esm/exports/index.js
var init_exports = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/abitype/dist/esm/exports/index.js"() {
    init_formatAbiItem();
    init_parseAbi();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/formatAbiItem.js
function formatAbiItem2(abiItem, { includeName = false } = {}) {
  if (abiItem.type !== "function" && abiItem.type !== "event" && abiItem.type !== "error")
    throw new InvalidDefinitionTypeError(abiItem.type);
  return `${abiItem.name}(${formatAbiParams(abiItem.inputs, { includeName })})`;
}
function formatAbiParams(params, { includeName = false } = {}) {
  if (!params)
    return "";
  return params.map((param) => formatAbiParam(param, { includeName })).join(includeName ? ", " : ",");
}
function formatAbiParam(param, { includeName }) {
  if (param.type.startsWith("tuple")) {
    return `(${formatAbiParams(param.components, { includeName })})${param.type.slice("tuple".length)}`;
  }
  return param.type + (includeName && param.name ? ` ${param.name}` : "");
}
var init_formatAbiItem2 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/formatAbiItem.js"() {
    init_abi();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/isHex.js
function isHex(value, { even = false, strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  if (even && value.length % 2 !== 0)
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
var init_isHex = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/isHex.js"() {
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/size.js
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/size.js"() {
    init_isHex();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/errors/version.js
var version2;
var init_version2 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/errors/version.js"() {
    version2 = "2.57.14";
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/errors/base.js
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig, BaseError2;
var init_base = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/errors/base.js"() {
    init_version2();
    errorConfig = {
      getDocsUrl: ({ docsBaseUrl, docsPath: docsPath3 = "", docsSlug }) => docsPath3 ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath3}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
      version: `viem@${version2}`
    };
    BaseError2 = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.details;
          if (args.cause?.message)
            return args.cause.message;
          return args.details;
        })();
        const docsPath3 = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.docsPath || args.docsPath;
          return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath: docsPath3 });
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsUrl ? [`Docs: ${docsUrl}`] : [],
          ...details ? [`Details: ${details}`] : [],
          ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
        ].join("\n");
        super(message, args.cause ? { cause: args.cause } : void 0);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "version", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "BaseError"
        });
        this.details = details;
        this.docsPath = docsPath3;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version2;
      }
      walk(fn) {
        return walk(this, fn);
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/errors/abi.js
var AbiDecodingDataSizeTooSmallError, AbiDecodingZeroDataError, AbiEncodingArrayLengthMismatchError, AbiEncodingBytesSizeMismatchError, AbiEncodingLengthMismatchError, AbiFunctionNotFoundError, AbiFunctionOutputsNotFoundError, AbiItemAmbiguityError, InvalidAbiEncodingTypeError, InvalidAbiDecodingTypeError, InvalidArrayError, InvalidDefinitionTypeError;
var init_abi = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/errors/abi.js"() {
    init_formatAbiItem2();
    init_size();
    init_base();
    AbiDecodingDataSizeTooSmallError = class extends BaseError2 {
      constructor({ data, params, size: size2 }) {
        super([`Data size of ${size2} bytes is too small for given parameters.`].join("\n"), {
          metaMessages: [
            `Params: (${formatAbiParams(params, { includeName: true })})`,
            `Data:   ${data} (${size2} bytes)`
          ],
          name: "AbiDecodingDataSizeTooSmallError"
        });
        Object.defineProperty(this, "data", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "params", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "size", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.data = data;
        this.params = params;
        this.size = size2;
      }
    };
    AbiDecodingZeroDataError = class extends BaseError2 {
      constructor({ cause } = {}) {
        super('Cannot decode zero data ("0x") with ABI parameters.', {
          name: "AbiDecodingZeroDataError",
          cause
        });
      }
    };
    AbiEncodingArrayLengthMismatchError = class extends BaseError2 {
      constructor({ expectedLength, givenLength, type }) {
        super([
          `ABI encoding array length mismatch for type ${type}.`,
          `Expected length: ${expectedLength}`,
          `Given length: ${givenLength}`
        ].join("\n"), { name: "AbiEncodingArrayLengthMismatchError" });
      }
    };
    AbiEncodingBytesSizeMismatchError = class extends BaseError2 {
      constructor({ expectedSize, value }) {
        super(`Size of bytes "${value}" (bytes${size(value)}) does not match expected size (bytes${expectedSize}).`, { name: "AbiEncodingBytesSizeMismatchError" });
      }
    };
    AbiEncodingLengthMismatchError = class extends BaseError2 {
      constructor({ expectedLength, givenLength }) {
        super([
          "ABI encoding params/values length mismatch.",
          `Expected length (params): ${expectedLength}`,
          `Given length (values): ${givenLength}`
        ].join("\n"), { name: "AbiEncodingLengthMismatchError" });
      }
    };
    AbiFunctionNotFoundError = class extends BaseError2 {
      constructor(functionName, { docsPath: docsPath3 } = {}) {
        super([
          `Function ${functionName ? `"${functionName}" ` : ""}not found on ABI.`,
          "Make sure you are using the correct ABI and that the function exists on it."
        ].join("\n"), {
          docsPath: docsPath3,
          name: "AbiFunctionNotFoundError"
        });
      }
    };
    AbiFunctionOutputsNotFoundError = class extends BaseError2 {
      constructor(functionName, { docsPath: docsPath3 }) {
        super([
          `Function "${functionName}" does not contain any \`outputs\` on ABI.`,
          "Cannot decode function result without knowing what the parameter types are.",
          "Make sure you are using the correct ABI and that the function exists on it."
        ].join("\n"), {
          docsPath: docsPath3,
          name: "AbiFunctionOutputsNotFoundError"
        });
      }
    };
    AbiItemAmbiguityError = class extends BaseError2 {
      constructor(x, y) {
        super("Found ambiguous types in overloaded ABI items.", {
          metaMessages: [
            `\`${x.type}\` in \`${formatAbiItem2(x.abiItem)}\`, and`,
            `\`${y.type}\` in \`${formatAbiItem2(y.abiItem)}\``,
            "",
            "These types encode differently and cannot be distinguished at runtime.",
            "Remove one of the ambiguous items in the ABI."
          ],
          name: "AbiItemAmbiguityError"
        });
      }
    };
    InvalidAbiEncodingTypeError = class extends BaseError2 {
      constructor(type, { docsPath: docsPath3 }) {
        super([
          `Type "${type}" is not a valid encoding type.`,
          "Please provide a valid ABI type."
        ].join("\n"), { docsPath: docsPath3, name: "InvalidAbiEncodingType" });
      }
    };
    InvalidAbiDecodingTypeError = class extends BaseError2 {
      constructor(type, { docsPath: docsPath3 }) {
        super([
          `Type "${type}" is not a valid decoding type.`,
          "Please provide a valid ABI type."
        ].join("\n"), { docsPath: docsPath3, name: "InvalidAbiDecodingType" });
      }
    };
    InvalidArrayError = class extends BaseError2 {
      constructor(value) {
        super([`Value "${value}" is not a valid array.`].join("\n"), {
          name: "InvalidArrayError"
        });
      }
    };
    InvalidDefinitionTypeError = class extends BaseError2 {
      constructor(type) {
        super([
          `"${type}" is not a valid definition type.`,
          'Valid types: "function", "event", "error"'
        ].join("\n"), { name: "InvalidDefinitionTypeError" });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/errors/data.js
var SliceOffsetOutOfBoundsError, SizeExceedsPaddingSizeError;
var init_data = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/errors/data.js"() {
    init_base();
    SliceOffsetOutOfBoundsError = class extends BaseError2 {
      constructor({ offset, position, size: size2 }) {
        super(`Slice ${position === "start" ? "starting" : "ending"} at offset "${offset}" is out-of-bounds (size: ${size2}).`, { name: "SliceOffsetOutOfBoundsError" });
      }
    };
    SizeExceedsPaddingSizeError = class extends BaseError2 {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/pad.js
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex4 = hex_.replace("0x", "");
  if (hex4.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex4.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex4[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i = 0; i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/pad.js"() {
    init_data();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/errors/encoding.js
var IntegerOutOfRangeError, InvalidBytesBooleanError, SizeOverflowError;
var init_encoding = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/errors/encoding.js"() {
    init_base();
    IntegerOutOfRangeError = class extends BaseError2 {
      constructor({ max, min, signed, size: size2, value }) {
        super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
      }
    };
    InvalidBytesBooleanError = class extends BaseError2 {
      constructor(bytes) {
        super(`Bytes value "${bytes}" is not a valid boolean. The bytes array must contain a single byte of either a 0 or 1 value.`, {
          name: "InvalidBytesBooleanError"
        });
      }
    };
    SizeOverflowError = class extends BaseError2 {
      constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/trim.js
function trim(hexOrBytes, { dir = "left" } = {}) {
  let data = typeof hexOrBytes === "string" ? hexOrBytes.replace("0x", "") : hexOrBytes;
  let sliceLength = 0;
  for (let i = 0; i < data.length - 1; i++) {
    if (data[dir === "left" ? i : data.length - i - 1].toString() === "0")
      sliceLength++;
    else
      break;
  }
  data = dir === "left" ? data.slice(sliceLength) : data.slice(0, data.length - sliceLength);
  if (typeof hexOrBytes === "string") {
    if (data.length === 1 && dir === "right")
      data = `${data}0`;
    return `0x${data.length % 2 === 1 ? `0${data}` : data}`;
  }
  return data;
}
var init_trim = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/trim.js"() {
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/fromHex.js
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
function hexToBigInt(hex4, opts = {}) {
  const { signed } = opts;
  if (opts.size)
    assertSize(hex4, { size: opts.size });
  const value = BigInt(hex4);
  if (!signed)
    return value;
  const size2 = Math.ceil((hex4.length - 2) / 2);
  const max = (1n << BigInt(size2) * 8n - 1n) - 1n;
  if (value <= max)
    return value;
  return value - BigInt(`0x${"f".padStart(size2 * 2, "f")}`) - 1n;
}
function hexToNumber(hex4, opts = {}) {
  const value = hexToBigInt(hex4, opts);
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new IntegerOutOfRangeError({
      max: `${Number.MAX_SAFE_INTEGER}`,
      min: `${Number.MIN_SAFE_INTEGER}`,
      signed: opts.signed,
      size: opts.size,
      value: `${value}n`
    });
  return number;
}
var init_fromHex = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/fromHex.js"() {
    init_encoding();
    init_size();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/toHex.js
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex4 = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex4, { size: opts.size });
    return pad(hex4, { size: opts.size });
  }
  return hex4;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  for (let i = 0; i < value.length; i++) {
    string += hexes[value[i]];
  }
  const hex4 = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex4, { size: opts.size });
    return pad(hex4, { dir: "right", size: opts.size });
  }
  return hex4;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex4 = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex4, { size: size2 });
  return hex4;
}
function stringToHex(value_, opts = {}) {
  const value = encoder.encode(value_);
  return bytesToHex(value, opts);
}
var hexes, encoder;
var init_toHex = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/toHex.js"() {
    init_encoding();
    init_pad();
    init_fromHex();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
    encoder = /* @__PURE__ */ new TextEncoder();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/toBytes.js
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex_, opts = {}) {
  let hex4 = hex_;
  if (opts.size) {
    assertSize(hex4, { size: opts.size });
    hex4 = pad(hex4, { dir: "right", size: opts.size });
  }
  let hexString = hex4.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError2(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex4 = numberToHex(value, opts);
  return hexToBytes(hex4);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder2.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder2, charCodeMap;
var init_toBytes = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/toBytes.js"() {
    init_base();
    init_isHex();
    init_pad();
    init_fromHex();
    init_toHex();
    encoder2 = /* @__PURE__ */ new TextEncoder();
    charCodeMap = {
      zero: 48,
      nine: 57,
      A: 65,
      F: 70,
      a: 97,
      f: 102
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@noble/hashes/esm/_u64.js
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var U32_MASK64, _32n, rotlSH, rotlSL, rotlBH, rotlBL;
var init_u64 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@noble/hashes/esm/_u64.js"() {
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    rotlSH = (h, l, s) => h << s | l >>> 32 - s;
    rotlSL = (h, l, s) => l << s | h >>> 32 - s;
    rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
    rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
var isLE, swap32IfBE, Hash;
var init_utils2 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@noble/hashes/esm/utils.js"() {
    isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    swap32IfBE = isLE ? (u) => u : byteSwap32;
    Hash = class {
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/@noble/hashes/esm/sha3.js
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var _0n, _1n, _2n, _7n, _256n, _0x71n, SHA3_PI, SHA3_ROTL, _SHA3_IOTA, IOTAS, SHA3_IOTA_H, SHA3_IOTA_L, rotlH, rotlL, Keccak, gen, keccak_256;
var init_sha3 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/@noble/hashes/esm/sha3.js"() {
    init_u64();
    init_utils2();
    _0n = BigInt(0);
    _1n = BigInt(1);
    _2n = BigInt(2);
    _7n = BigInt(7);
    _256n = BigInt(256);
    _0x71n = BigInt(113);
    SHA3_PI = [];
    SHA3_ROTL = [];
    _SHA3_IOTA = [];
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
      [x, y] = [y, (2 * x + 3 * y) % 5];
      SHA3_PI.push(2 * (5 * y + x));
      SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
      let t = _0n;
      for (let j = 0; j < 7; j++) {
        R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
        if (R & _2n)
          t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
      }
      _SHA3_IOTA.push(t);
    }
    IOTAS = split(_SHA3_IOTA, true);
    SHA3_IOTA_H = IOTAS[0];
    SHA3_IOTA_L = IOTAS[1];
    rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    Keccak = class _Keccak extends Hash {
      // NOTE: we accept arguments in bytes instead of bits here.
      constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        this.enableXOF = false;
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        anumber(outputLen);
        if (!(0 < blockLen && blockLen < 200))
          throw new Error("only keccak-f1600 function is supported");
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
      }
      clone() {
        return this._cloneInto();
      }
      keccak() {
        swap32IfBE(this.state32);
        keccakP(this.state32, this.rounds);
        swap32IfBE(this.state32);
        this.posOut = 0;
        this.pos = 0;
      }
      update(data) {
        aexists(this);
        data = toBytes2(data);
        abytes(data);
        const { blockLen, state } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          for (let i = 0; i < take; i++)
            state[this.pos++] ^= data[pos++];
          if (this.pos === blockLen)
            this.keccak();
        }
        return this;
      }
      finish() {
        if (this.finished)
          return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        state[pos] ^= suffix;
        if ((suffix & 128) !== 0 && pos === blockLen - 1)
          this.keccak();
        state[blockLen - 1] ^= 128;
        this.keccak();
      }
      writeInto(out) {
        aexists(this, false);
        abytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len; ) {
          if (this.posOut >= blockLen)
            this.keccak();
          const take = Math.min(blockLen - this.posOut, len - pos);
          out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
          this.posOut += take;
          pos += take;
        }
        return out;
      }
      xofInto(out) {
        if (!this.enableXOF)
          throw new Error("XOF is not possible for this instance");
        return this.writeInto(out);
      }
      xof(bytes) {
        anumber(bytes);
        return this.xofInto(new Uint8Array(bytes));
      }
      digestInto(out) {
        aoutput(out, this);
        if (this.finished)
          throw new Error("digest() was already called");
        this.writeInto(out);
        this.destroy();
        return out;
      }
      digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
      }
      destroy() {
        this.destroyed = true;
        clean(this.state);
      }
      _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
      }
    };
    gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
    keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/keccak256.js
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/keccak256.js"() {
    init_sha3();
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/hashSignature.js
function hashSignature(sig) {
  return hash(sig);
}
var hash;
var init_hashSignature = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/hashSignature.js"() {
    init_toBytes();
    init_keccak256();
    hash = (value) => keccak256(toBytes(value));
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/normalizeSignature.js
function normalizeSignature(signature) {
  let active = true;
  let current = "";
  let level = 0;
  let result = "";
  let valid = false;
  for (let i = 0; i < signature.length; i++) {
    const char = signature[i];
    if (["(", ")", ","].includes(char))
      active = true;
    if (char === "(")
      level++;
    if (char === ")")
      level--;
    if (!active)
      continue;
    if (level === 0) {
      if (char === " " && ["event", "function", "error", ""].includes(result))
        result = "";
      else {
        result += char;
        if (char === ")") {
          valid = true;
          break;
        }
      }
      continue;
    }
    if (char === " ") {
      if (!current.endsWith(",") && !current.endsWith("(")) {
        current = "";
        active = false;
      }
      continue;
    }
    result += char;
    current += char;
  }
  if (!valid)
    throw new BaseError2("Unable to normalize signature.");
  return result;
}
var init_normalizeSignature = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/normalizeSignature.js"() {
    init_base();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toSignature.js
var toSignature;
var init_toSignature = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toSignature.js"() {
    init_exports();
    init_normalizeSignature();
    toSignature = (def) => {
      const def_ = (() => {
        if (typeof def === "string")
          return def;
        return formatAbiItem(def);
      })();
      return normalizeSignature(def_);
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toSignatureHash.js
function toSignatureHash(fn) {
  return hashSignature(toSignature(fn));
}
var init_toSignatureHash = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toSignatureHash.js"() {
    init_hashSignature();
    init_toSignature();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toEventSelector.js
var toEventSelector;
var init_toEventSelector = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toEventSelector.js"() {
    init_toSignatureHash();
    toEventSelector = toSignatureHash;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/errors/address.js
var InvalidAddressError;
var init_address = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/errors/address.js"() {
    init_base();
    InvalidAddressError = class extends BaseError2 {
      constructor({ address: address2 }) {
        super(`Address "${address2}" is invalid.`, {
          metaMessages: [
            "- Address must be a hex value of 20 bytes (40 hex characters).",
            "- Address must match its checksum counterpart."
          ],
          name: "InvalidAddressError"
        });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/lru.js
var LruMap;
var init_lru = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/lru.js"() {
    LruMap = class extends Map {
      constructor(size2) {
        super();
        Object.defineProperty(this, "maxSize", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.maxSize = size2;
      }
      get(key2) {
        const value = super.get(key2);
        if (super.has(key2)) {
          super.delete(key2);
          super.set(key2, value);
        }
        return value;
      }
      set(key2, value) {
        if (super.has(key2))
          super.delete(key2);
        super.set(key2, value);
        if (this.maxSize && this.size > this.maxSize) {
          const firstKey = super.keys().next().value;
          if (firstKey !== void 0)
            super.delete(firstKey);
        }
        return this;
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/address/getAddress.js
function checksumAddress(address_, chainId) {
  if (checksumAddressCache.has(`${address_}.${chainId}`))
    return checksumAddressCache.get(`${address_}.${chainId}`);
  const hexAddress = chainId ? `${chainId}${address_.toLowerCase()}` : address_.substring(2).toLowerCase();
  const hash2 = keccak256(stringToBytes(hexAddress), "bytes");
  const address2 = (chainId ? hexAddress.substring(`${chainId}0x`.length) : hexAddress).split("");
  for (let i = 0; i < 40; i += 2) {
    if (hash2[i >> 1] >> 4 >= 8 && address2[i]) {
      address2[i] = address2[i].toUpperCase();
    }
    if ((hash2[i >> 1] & 15) >= 8 && address2[i + 1]) {
      address2[i + 1] = address2[i + 1].toUpperCase();
    }
  }
  const result = `0x${address2.join("")}`;
  checksumAddressCache.set(`${address_}.${chainId}`, result);
  return result;
}
var checksumAddressCache;
var init_getAddress = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/address/getAddress.js"() {
    init_toBytes();
    init_keccak256();
    init_lru();
    checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/address/isAddress.js
function isAddress(address2, options) {
  const { strict = true } = options ?? {};
  const cacheKey = `${address2}.${strict}`;
  if (isAddressCache.has(cacheKey))
    return isAddressCache.get(cacheKey);
  const result = (() => {
    if (!addressRegex.test(address2))
      return false;
    if (address2.toLowerCase() === address2)
      return true;
    if (strict)
      return checksumAddress(address2) === address2;
    return true;
  })();
  isAddressCache.set(cacheKey, result);
  return result;
}
var addressRegex, isAddressCache;
var init_isAddress = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/address/isAddress.js"() {
    init_lru();
    init_getAddress();
    addressRegex = /^0x[a-fA-F0-9]{40}$/;
    isAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/concat.js
function concatHex(values) {
  return `0x${values.reduce((acc, x) => acc + x.replace("0x", ""), "")}`;
}
var init_concat = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/concat.js"() {
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/slice.js
function slice(value, start, end, { strict } = {}) {
  if (isHex(value, { strict: false }))
    return sliceHex(value, start, end, {
      strict
    });
  return sliceBytes(value, start, end, {
    strict
  });
}
function assertStartOffset(value, start) {
  if (typeof start === "number" && start > 0 && start > size(value) - 1)
    throw new SliceOffsetOutOfBoundsError({
      offset: start,
      position: "start",
      size: size(value)
    });
}
function assertEndOffset(value, start, end) {
  if (typeof start === "number" && typeof end === "number" && size(value) !== end - start) {
    throw new SliceOffsetOutOfBoundsError({
      offset: end,
      position: "end",
      size: size(value)
    });
  }
}
function sliceBytes(value_, start, end, { strict } = {}) {
  assertStartOffset(value_, start);
  const value = value_.slice(start, end);
  if (strict)
    assertEndOffset(value, start, end);
  return value;
}
function sliceHex(value_, start, end, { strict } = {}) {
  assertStartOffset(value_, start);
  const value = `0x${value_.replace("0x", "").slice((start ?? 0) * 2, (end ?? value_.length) * 2)}`;
  if (strict)
    assertEndOffset(value, start, end);
  return value;
}
var init_slice = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/data/slice.js"() {
    init_data();
    init_isHex();
    init_size();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/regex.js
var integerRegex2;
var init_regex2 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/regex.js"() {
    integerRegex2 = /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/encodeAbiParameters.js
function encodeAbiParameters(params, values) {
  if (params.length !== values.length)
    throw new AbiEncodingLengthMismatchError({
      expectedLength: params.length,
      givenLength: values.length
    });
  const preparedParams = prepareParams({
    params,
    values
  });
  return encodeParams(preparedParams);
}
function prepareParams({ params, values }) {
  const preparedParams = [];
  for (let i = 0; i < params.length; i++) {
    preparedParams.push(prepareParam({ param: params[i], value: values[i] }));
  }
  return preparedParams;
}
function prepareParam({ param, value }) {
  const arrayComponents = getArrayComponents(param.type);
  if (arrayComponents) {
    const [length, type] = arrayComponents;
    return encodeArray(value, { length, param: { ...param, type } });
  }
  if (param.type === "tuple") {
    return encodeTuple(value, {
      param
    });
  }
  if (param.type === "address") {
    return encodeAddress(value);
  }
  if (param.type === "bool") {
    return encodeBool(value);
  }
  if (param.type.startsWith("uint") || param.type.startsWith("int")) {
    const signed = param.type.startsWith("int");
    const [, , size2 = "256"] = integerRegex2.exec(param.type) ?? [];
    return encodeNumber(value, {
      signed,
      size: Number(size2)
    });
  }
  if (param.type.startsWith("bytes")) {
    return encodeBytes(value, { param });
  }
  if (param.type === "string") {
    return encodeString(value);
  }
  throw new InvalidAbiEncodingTypeError(param.type, {
    docsPath: "/docs/contract/encodeAbiParameters"
  });
}
function encodeParams(preparedParams) {
  let staticSize = 0;
  for (let i = 0; i < preparedParams.length; i++) {
    const { dynamic, encoded } = preparedParams[i];
    if (dynamic)
      staticSize += 32;
    else
      staticSize += size(encoded);
  }
  const staticParams = [];
  const dynamicParams = [];
  let dynamicSize = 0;
  for (let i = 0; i < preparedParams.length; i++) {
    const { dynamic, encoded } = preparedParams[i];
    if (dynamic) {
      staticParams.push(numberToHex(staticSize + dynamicSize, { size: 32 }));
      dynamicParams.push(encoded);
      dynamicSize += size(encoded);
    } else {
      staticParams.push(encoded);
    }
  }
  return concatHex([...staticParams, ...dynamicParams]);
}
function encodeAddress(value) {
  if (!isAddress(value))
    throw new InvalidAddressError({ address: value });
  return { dynamic: false, encoded: padHex(value.toLowerCase()) };
}
function encodeArray(value, { length, param }) {
  const dynamic = length === null;
  if (!Array.isArray(value))
    throw new InvalidArrayError(value);
  if (!dynamic && value.length !== length)
    throw new AbiEncodingArrayLengthMismatchError({
      expectedLength: length,
      givenLength: value.length,
      type: `${param.type}[${length}]`
    });
  let dynamicChild = value.length === 0 && isDynamicType(param);
  const preparedParams = [];
  for (let i = 0; i < value.length; i++) {
    const preparedParam = prepareParam({ param, value: value[i] });
    if (preparedParam.dynamic)
      dynamicChild = true;
    preparedParams.push(preparedParam);
  }
  if (dynamic || dynamicChild) {
    const data = encodeParams(preparedParams);
    if (dynamic) {
      const length2 = numberToHex(preparedParams.length, { size: 32 });
      return {
        dynamic: true,
        encoded: concatHex([length2, data])
      };
    }
    if (dynamicChild)
      return { dynamic: true, encoded: data };
  }
  return {
    dynamic: false,
    encoded: concatHex(preparedParams.map(({ encoded }) => encoded))
  };
}
function encodeBytes(value, { param }) {
  const [, paramSize] = param.type.split("bytes");
  const bytesSize = size(value);
  if (!paramSize) {
    let value_ = value;
    if (bytesSize % 32 !== 0)
      value_ = padHex(value_, {
        dir: "right",
        size: Math.ceil((value.length - 2) / 2 / 32) * 32
      });
    return {
      dynamic: true,
      encoded: concatHex([
        padHex(numberToHex(bytesSize, { size: 32 })),
        value_
      ])
    };
  }
  if (bytesSize !== Number.parseInt(paramSize, 10))
    throw new AbiEncodingBytesSizeMismatchError({
      expectedSize: Number.parseInt(paramSize, 10),
      value
    });
  return { dynamic: false, encoded: padHex(value, { dir: "right" }) };
}
function encodeBool(value) {
  if (typeof value !== "boolean")
    throw new BaseError2(`Invalid boolean value: "${value}" (type: ${typeof value}). Expected: \`true\` or \`false\`.`);
  return { dynamic: false, encoded: padHex(boolToHex(value)) };
}
function encodeNumber(value, { signed, size: size2 = 256 }) {
  if (typeof size2 === "number") {
    const max = 2n ** (BigInt(size2) - (signed ? 1n : 0n)) - 1n;
    const min = signed ? -max - 1n : 0n;
    if (value > max || value < min)
      throw new IntegerOutOfRangeError({
        max: max.toString(),
        min: min.toString(),
        signed,
        size: size2 / 8,
        value: value.toString()
      });
  }
  return {
    dynamic: false,
    encoded: numberToHex(value, {
      size: 32,
      signed
    })
  };
}
function encodeString(value) {
  const hexValue = stringToHex(value);
  const partsLength = Math.ceil(size(hexValue) / 32);
  const parts = [];
  for (let i = 0; i < partsLength; i++) {
    parts.push(padHex(slice(hexValue, i * 32, (i + 1) * 32), {
      dir: "right"
    }));
  }
  return {
    dynamic: true,
    encoded: concatHex([
      padHex(numberToHex(size(hexValue), { size: 32 })),
      ...parts
    ])
  };
}
function encodeTuple(value, { param }) {
  let dynamic = false;
  const preparedParams = [];
  for (let i = 0; i < param.components.length; i++) {
    const param_ = param.components[i];
    const index = Array.isArray(value) ? i : param_.name;
    const preparedParam = prepareParam({
      param: param_,
      value: value[index]
    });
    preparedParams.push(preparedParam);
    if (preparedParam.dynamic)
      dynamic = true;
  }
  return {
    dynamic,
    encoded: dynamic ? encodeParams(preparedParams) : concatHex(preparedParams.map(({ encoded }) => encoded))
  };
}
function getArrayComponents(type) {
  const matches = type.match(/^(.*)\[(\d+)?\]$/);
  return matches ? (
    // Return `null` if the array is dynamic.
    [matches[2] ? Number(matches[2]) : null, matches[1]]
  ) : void 0;
}
function isDynamicType(param) {
  const { type } = param;
  if (type === "string")
    return true;
  if (type === "bytes")
    return true;
  if (type.endsWith("[]"))
    return true;
  if (type === "tuple")
    return param.components.some(isDynamicType);
  const arrayComponents = getArrayComponents(type);
  if (arrayComponents)
    return isDynamicType({ ...param, type: arrayComponents[1] });
  return false;
}
var init_encodeAbiParameters = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/encodeAbiParameters.js"() {
    init_abi();
    init_address();
    init_base();
    init_encoding();
    init_isAddress();
    init_concat();
    init_pad();
    init_size();
    init_slice();
    init_toHex();
    init_regex2();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toFunctionSelector.js
var toFunctionSelector;
var init_toFunctionSelector = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/hash/toFunctionSelector.js"() {
    init_slice();
    init_toSignatureHash();
    toFunctionSelector = (fn) => slice(toSignatureHash(fn), 0, 4);
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/getAbiItem.js
function getAbiItem(parameters) {
  const { abi, args = [], name } = parameters;
  const isSelector = isHex(name, { strict: false });
  const abiItems = abi.filter((abiItem) => {
    if (isSelector) {
      if (abiItem.type === "function")
        return toFunctionSelector(abiItem) === name;
      if (abiItem.type === "event")
        return toEventSelector(abiItem) === name;
      return false;
    }
    return "name" in abiItem && abiItem.name === name;
  });
  if (abiItems.length === 0)
    return void 0;
  if (abiItems.length === 1)
    return abiItems[0];
  let matchedAbiItem;
  for (const abiItem of abiItems) {
    if (!("inputs" in abiItem))
      continue;
    if (!args || args.length === 0) {
      if (!abiItem.inputs || abiItem.inputs.length === 0)
        return abiItem;
      continue;
    }
    if (!abiItem.inputs)
      continue;
    if (abiItem.inputs.length === 0)
      continue;
    if (abiItem.inputs.length !== args.length)
      continue;
    const matched = args.every((arg, index) => {
      const abiParameter = "inputs" in abiItem && abiItem.inputs[index];
      if (!abiParameter)
        return false;
      return isArgOfType(arg, abiParameter);
    });
    if (matched) {
      if (matchedAbiItem && "inputs" in matchedAbiItem && matchedAbiItem.inputs) {
        const ambiguousTypes = getAmbiguousTypes(abiItem.inputs, matchedAbiItem.inputs, args);
        if (ambiguousTypes)
          throw new AbiItemAmbiguityError({
            abiItem,
            type: ambiguousTypes[0]
          }, {
            abiItem: matchedAbiItem,
            type: ambiguousTypes[1]
          });
      }
      matchedAbiItem = abiItem;
    }
  }
  if (matchedAbiItem)
    return matchedAbiItem;
  return abiItems[0];
}
function isArgOfType(arg, abiParameter) {
  const argType = typeof arg;
  const abiParameterType = abiParameter.type;
  switch (abiParameterType) {
    case "address":
      return isAddress(arg, { strict: false });
    case "bool":
      return argType === "boolean";
    case "function":
      return argType === "string";
    case "string":
      return argType === "string";
    default: {
      if (abiParameterType === "tuple" && "components" in abiParameter)
        return Object.values(abiParameter.components).every((component, index) => {
          return argType === "object" && isArgOfType(getComponentValue(arg, component, index), component);
        });
      if (/^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(abiParameterType))
        return argType === "number" || argType === "bigint";
      if (/^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(abiParameterType))
        return argType === "string" || arg instanceof Uint8Array;
      const arrayComponents = getArrayComponents(abiParameterType);
      if (arrayComponents) {
        const [length, type] = arrayComponents;
        return Array.isArray(arg) && (length === null || arg.length === length) && arg.every((x) => isArgOfType(x, { ...abiParameter, type }));
      }
      return false;
    }
  }
}
function getAmbiguousTypes(sourceParameters, targetParameters, args) {
  for (const parameterIndex in sourceParameters) {
    const sourceParameter = sourceParameters[parameterIndex];
    const targetParameter = targetParameters[parameterIndex];
    if (!targetParameter)
      continue;
    if (sourceParameter.type === "tuple" && targetParameter.type === "tuple" && "components" in sourceParameter && "components" in targetParameter) {
      const value2 = args[parameterIndex];
      const types3 = getAmbiguousTypes(sourceParameter.components, targetParameter.components, sourceParameter.components.map((component, index) => getComponentValue(value2, component, index)));
      if (types3)
        return types3;
      continue;
    }
    const sourceArray = getArrayComponents(sourceParameter.type);
    const targetArray = getArrayComponents(targetParameter.type);
    if (sourceArray && targetArray) {
      const types3 = getAmbiguousTypes([{ ...sourceParameter, type: sourceArray[1] }], [{ ...targetParameter, type: targetArray[1] }], [args[parameterIndex]?.[0]]);
      if (types3)
        return types3;
      continue;
    }
    const types2 = [sourceParameter.type, targetParameter.type];
    const value = args[parameterIndex];
    const ambiguous = (() => {
      if (types2.includes("address") && types2.includes("bytes20"))
        return true;
      if (types2.includes("address") && (types2.includes("string") || types2.includes("bytes")))
        return value === void 0 || isAddress(value, { strict: false });
      return false;
    })();
    if (ambiguous)
      return types2;
  }
  return;
}
function getComponentValue(arg, component, index) {
  if (Array.isArray(arg))
    return arg[index];
  return arg?.[component.name];
}
var init_getAbiItem = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/getAbiItem.js"() {
    init_abi();
    init_isHex();
    init_isAddress();
    init_toEventSelector();
    init_toFunctionSelector();
    init_encodeAbiParameters();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/prepareEncodeFunctionData.js
function prepareEncodeFunctionData(parameters) {
  const { abi, args, functionName } = parameters;
  let abiItem = abi[0];
  if (functionName) {
    const item = getAbiItem({
      abi,
      args,
      name: functionName
    });
    if (!item)
      throw new AbiFunctionNotFoundError(functionName, { docsPath });
    abiItem = item;
  }
  if (abiItem.type !== "function")
    throw new AbiFunctionNotFoundError(void 0, { docsPath });
  return {
    abi: [abiItem],
    functionName: toFunctionSelector(formatAbiItem2(abiItem))
  };
}
var docsPath;
var init_prepareEncodeFunctionData = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/prepareEncodeFunctionData.js"() {
    init_abi();
    init_toFunctionSelector();
    init_formatAbiItem2();
    init_getAbiItem();
    docsPath = "/docs/contract/encodeFunctionData";
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/encodeFunctionData.js
function encodeFunctionData(parameters) {
  const { args } = parameters;
  const { abi, functionName } = (() => {
    if (parameters.abi.length === 1 && parameters.functionName?.startsWith("0x"))
      return parameters;
    return prepareEncodeFunctionData(parameters);
  })();
  const abiItem = abi[0];
  const signature = functionName;
  const data = "inputs" in abiItem && abiItem.inputs ? encodeAbiParameters(abiItem.inputs, args ?? []) : void 0;
  return concatHex([signature, data ?? "0x"]);
}
var init_encodeFunctionData = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/encodeFunctionData.js"() {
    init_concat();
    init_encodeAbiParameters();
    init_prepareEncodeFunctionData();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/errors/cursor.js
var NegativeOffsetError, PositionOutOfBoundsError, RecursiveReadLimitExceededError;
var init_cursor = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/errors/cursor.js"() {
    init_base();
    NegativeOffsetError = class extends BaseError2 {
      constructor({ offset }) {
        super(`Offset \`${offset}\` cannot be negative.`, {
          name: "NegativeOffsetError"
        });
      }
    };
    PositionOutOfBoundsError = class extends BaseError2 {
      constructor({ length, position }) {
        super(`Position \`${position}\` is out of bounds (\`0 < position < ${length}\`).`, { name: "PositionOutOfBoundsError" });
      }
    };
    RecursiveReadLimitExceededError = class extends BaseError2 {
      constructor({ count, limit }) {
        super(`Recursive read limit of \`${limit}\` exceeded (recursive read count: \`${count}\`).`, { name: "RecursiveReadLimitExceededError" });
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/cursor.js
function createCursor(bytes, { recursiveReadLimit = 8192 } = {}) {
  const cursor = Object.create(staticCursor);
  cursor.bytes = bytes;
  cursor.dataView = new DataView(bytes.buffer ?? bytes, bytes.byteOffset, bytes.byteLength);
  cursor.positionReadCount = /* @__PURE__ */ new Map();
  cursor.recursiveReadLimit = recursiveReadLimit;
  return cursor;
}
var staticCursor;
var init_cursor2 = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/cursor.js"() {
    init_cursor();
    staticCursor = {
      bytes: new Uint8Array(),
      dataView: new DataView(new ArrayBuffer(0)),
      position: 0,
      positionReadCount: /* @__PURE__ */ new Map(),
      recursiveReadCount: 0,
      recursiveReadLimit: Number.POSITIVE_INFINITY,
      assertReadLimit() {
        if (this.recursiveReadCount >= this.recursiveReadLimit)
          throw new RecursiveReadLimitExceededError({
            count: this.recursiveReadCount + 1,
            limit: this.recursiveReadLimit
          });
      },
      assertPosition(position) {
        if (position < 0 || position > this.bytes.length - 1)
          throw new PositionOutOfBoundsError({
            length: this.bytes.length,
            position
          });
      },
      decrementPosition(offset) {
        if (offset < 0)
          throw new NegativeOffsetError({ offset });
        const position = this.position - offset;
        this.assertPosition(position);
        this.position = position;
      },
      getReadCount(position) {
        return this.positionReadCount.get(position || this.position) || 0;
      },
      incrementPosition(offset) {
        if (offset < 0)
          throw new NegativeOffsetError({ offset });
        const position = this.position + offset;
        this.assertPosition(position);
        this.position = position;
      },
      inspectByte(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
      },
      inspectBytes(length, position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + length - 1);
        return this.bytes.subarray(position, position + length);
      },
      inspectUint8(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
      },
      inspectUint16(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 1);
        return this.dataView.getUint16(position);
      },
      inspectUint24(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 2);
        return (this.dataView.getUint16(position) << 8) + this.dataView.getUint8(position + 2);
      },
      inspectUint32(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 3);
        return this.dataView.getUint32(position);
      },
      pushByte(byte) {
        this.assertPosition(this.position);
        this.bytes[this.position] = byte;
        this.position++;
      },
      pushBytes(bytes) {
        this.assertPosition(this.position + bytes.length - 1);
        this.bytes.set(bytes, this.position);
        this.position += bytes.length;
      },
      pushUint8(value) {
        this.assertPosition(this.position);
        this.bytes[this.position] = value;
        this.position++;
      },
      pushUint16(value) {
        this.assertPosition(this.position + 1);
        this.dataView.setUint16(this.position, value);
        this.position += 2;
      },
      pushUint24(value) {
        this.assertPosition(this.position + 2);
        this.dataView.setUint16(this.position, value >> 8);
        this.dataView.setUint8(this.position + 2, value & ~4294967040);
        this.position += 3;
      },
      pushUint32(value) {
        this.assertPosition(this.position + 3);
        this.dataView.setUint32(this.position, value);
        this.position += 4;
      },
      readByte() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectByte();
        this.position++;
        return value;
      },
      readBytes(length, size2) {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectBytes(length);
        this.position += size2 ?? length;
        return value;
      },
      readUint8() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint8();
        this.position += 1;
        return value;
      },
      readUint16() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint16();
        this.position += 2;
        return value;
      },
      readUint24() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint24();
        this.position += 3;
        return value;
      },
      readUint32() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint32();
        this.position += 4;
        return value;
      },
      get remaining() {
        return this.bytes.length - this.position;
      },
      setPosition(position) {
        const oldPosition = this.position;
        this.assertPosition(position);
        this.position = position;
        return () => this.position = oldPosition;
      },
      _touch() {
        if (this.recursiveReadLimit === Number.POSITIVE_INFINITY)
          return;
        const count = this.getReadCount();
        this.positionReadCount.set(this.position, count + 1);
        if (count > 0)
          this.recursiveReadCount++;
      }
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/fromBytes.js
function bytesToBigInt(bytes, opts = {}) {
  if (typeof opts.size !== "undefined")
    assertSize(bytes, { size: opts.size });
  const hex4 = bytesToHex(bytes);
  return hexToBigInt(hex4, opts);
}
function bytesToBool(bytes_, opts = {}) {
  let bytes = bytes_;
  if (typeof opts.size !== "undefined") {
    assertSize(bytes, { size: opts.size });
    bytes = trim(bytes);
  }
  if (bytes.length > 1 || bytes[0] > 1)
    throw new InvalidBytesBooleanError(bytes);
  return Boolean(bytes[0]);
}
function bytesToNumber(bytes, opts = {}) {
  if (typeof opts.size !== "undefined")
    assertSize(bytes, { size: opts.size });
  const hex4 = bytesToHex(bytes);
  return hexToNumber(hex4, opts);
}
function bytesToString(bytes_, opts = {}) {
  let bytes = bytes_;
  if (typeof opts.size !== "undefined") {
    assertSize(bytes, { size: opts.size });
    bytes = trim(bytes, { dir: "right" });
  }
  return new TextDecoder().decode(bytes);
}
var init_fromBytes = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/encoding/fromBytes.js"() {
    init_encoding();
    init_trim();
    init_fromHex();
    init_toHex();
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/decodeAbiParameters.js
function decodeAbiParameters(params, data) {
  const bytes = typeof data === "string" ? hexToBytes(data) : data;
  const cursor = createCursor(bytes);
  if (size(bytes) === 0 && params.length > 0)
    throw new AbiDecodingZeroDataError();
  if (size(data) && size(data) < 32)
    throw new AbiDecodingDataSizeTooSmallError({
      data: typeof data === "string" ? data : bytesToHex(data),
      params,
      size: size(data)
    });
  let consumed = 0;
  const values = [];
  for (let i = 0; i < params.length; ++i) {
    const param = params[i];
    if (consumed < bytes.length)
      cursor.setPosition(consumed);
    const [data2, consumed_] = decodeParameter(cursor, param, {
      staticPosition: 0
    });
    consumed += consumed_;
    values.push(data2);
  }
  return values;
}
function decodeParameter(cursor, param, { staticPosition }) {
  const arrayComponents = getArrayComponents(param.type);
  if (arrayComponents) {
    const [length, type] = arrayComponents;
    return decodeArray(cursor, { ...param, type }, { length, staticPosition });
  }
  if (param.type === "tuple")
    return decodeTuple(cursor, param, { staticPosition });
  if (param.type === "address")
    return decodeAddress(cursor);
  if (param.type === "bool")
    return decodeBool(cursor);
  if (param.type.startsWith("bytes"))
    return decodeBytes(cursor, param, { staticPosition });
  if (param.type.startsWith("uint") || param.type.startsWith("int"))
    return decodeNumber(cursor, param);
  if (param.type === "string")
    return decodeString(cursor, { staticPosition });
  throw new InvalidAbiDecodingTypeError(param.type, {
    docsPath: "/docs/contract/decodeAbiParameters"
  });
}
function decodeAddress(cursor) {
  const value = cursor.readBytes(32);
  return [checksumAddress(bytesToHex(sliceBytes(value, -20))), 32];
}
function decodeArray(cursor, param, { length, staticPosition }) {
  if (length === null) {
    const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
    const start = staticPosition + offset;
    const startOfData = start + sizeOfLength;
    cursor.setPosition(start);
    const length2 = bytesToNumber(cursor.readBytes(sizeOfLength));
    const dynamicChild = hasDynamicChild(param);
    let consumed2 = 0;
    const value2 = [];
    for (let i = 0; i < length2; ++i) {
      cursor.setPosition(startOfData + (dynamicChild ? i * 32 : consumed2));
      const [data, consumed_] = decodeParameter(cursor, param, {
        staticPosition: startOfData
      });
      consumed2 += consumed_;
      value2.push(data);
      if (consumed_ === 0) {
        cursor.assertReadLimit();
        cursor._touch();
      }
    }
    cursor.setPosition(staticPosition + 32);
    return [value2, 32];
  }
  if (hasDynamicChild(param)) {
    const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
    const start = staticPosition + offset;
    const value2 = [];
    for (let i = 0; i < length; ++i) {
      cursor.setPosition(start + i * 32);
      const [data] = decodeParameter(cursor, param, {
        staticPosition: start
      });
      value2.push(data);
    }
    cursor.setPosition(staticPosition + 32);
    return [value2, 32];
  }
  let consumed = 0;
  const value = [];
  for (let i = 0; i < length; ++i) {
    const [data, consumed_] = decodeParameter(cursor, param, {
      staticPosition: staticPosition + consumed
    });
    consumed += consumed_;
    value.push(data);
    if (consumed_ === 0) {
      cursor.assertReadLimit();
      cursor._touch();
    }
  }
  return [value, consumed];
}
function decodeBool(cursor) {
  return [bytesToBool(cursor.readBytes(32), { size: 32 }), 32];
}
function decodeBytes(cursor, param, { staticPosition }) {
  const [_, size2] = param.type.split("bytes");
  if (!size2) {
    const offset = bytesToNumber(cursor.readBytes(32));
    cursor.setPosition(staticPosition + offset);
    const length = bytesToNumber(cursor.readBytes(32));
    if (length === 0) {
      cursor.setPosition(staticPosition + 32);
      return ["0x", 32];
    }
    const data = cursor.readBytes(length);
    cursor.setPosition(staticPosition + 32);
    return [bytesToHex(data), 32];
  }
  const value = bytesToHex(cursor.readBytes(Number.parseInt(size2, 10), 32));
  return [value, 32];
}
function decodeNumber(cursor, param) {
  const signed = param.type.startsWith("int");
  const size2 = Number.parseInt(param.type.split("int")[1] || "256", 10);
  const value = cursor.readBytes(32);
  return [
    size2 > 48 ? bytesToBigInt(value, { signed }) : bytesToNumber(value, { signed }),
    32
  ];
}
function decodeTuple(cursor, param, { staticPosition }) {
  const hasUnnamedChild = param.components.length === 0 || param.components.some(({ name }) => !name);
  const value = hasUnnamedChild ? [] : {};
  let consumed = 0;
  if (hasDynamicChild(param)) {
    const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
    const start = staticPosition + offset;
    for (let i = 0; i < param.components.length; ++i) {
      const component = param.components[i];
      cursor.setPosition(start + consumed);
      const [data, consumed_] = decodeParameter(cursor, component, {
        staticPosition: start
      });
      consumed += consumed_;
      value[hasUnnamedChild ? i : component?.name] = data;
    }
    cursor.setPosition(staticPosition + 32);
    return [value, 32];
  }
  for (let i = 0; i < param.components.length; ++i) {
    const component = param.components[i];
    const [data, consumed_] = decodeParameter(cursor, component, {
      staticPosition
    });
    value[hasUnnamedChild ? i : component?.name] = data;
    consumed += consumed_;
  }
  return [value, consumed];
}
function decodeString(cursor, { staticPosition }) {
  const offset = bytesToNumber(cursor.readBytes(32));
  const start = staticPosition + offset;
  cursor.setPosition(start);
  const length = bytesToNumber(cursor.readBytes(32));
  if (length === 0) {
    cursor.setPosition(staticPosition + 32);
    return ["", 32];
  }
  const data = cursor.readBytes(length, 32);
  const value = bytesToString(data);
  cursor.setPosition(staticPosition + 32);
  return [value, 32];
}
function hasDynamicChild(param) {
  const { type } = param;
  if (type === "string")
    return true;
  if (type === "bytes")
    return true;
  if (type.endsWith("[]"))
    return true;
  if (type === "tuple")
    return param.components?.some(hasDynamicChild);
  const arrayComponents = getArrayComponents(param.type);
  if (arrayComponents && hasDynamicChild({ ...param, type: arrayComponents[1] }))
    return true;
  return false;
}
var sizeOfLength, sizeOfOffset;
var init_decodeAbiParameters = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/decodeAbiParameters.js"() {
    init_abi();
    init_getAddress();
    init_cursor2();
    init_size();
    init_slice();
    init_fromBytes();
    init_toBytes();
    init_toHex();
    init_encodeAbiParameters();
    sizeOfLength = 32;
    sizeOfOffset = 32;
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/decodeFunctionResult.js
function decodeFunctionResult(parameters) {
  const { abi, args, functionName, data } = parameters;
  let abiItem = abi[0];
  if (functionName) {
    const item = getAbiItem({ abi, args, name: functionName });
    if (!item)
      throw new AbiFunctionNotFoundError(functionName, { docsPath: docsPath2 });
    abiItem = item;
  }
  if (abiItem.type !== "function")
    throw new AbiFunctionNotFoundError(void 0, { docsPath: docsPath2 });
  if (!abiItem.outputs)
    throw new AbiFunctionOutputsNotFoundError(abiItem.name, { docsPath: docsPath2 });
  const values = decodeAbiParameters(abiItem.outputs, data);
  if (values && values.length > 1)
    return values;
  if (values && values.length === 1)
    return values[0];
  return void 0;
}
var docsPath2;
var init_decodeFunctionResult = __esm({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/node_modules/viem/_esm/utils/abi/decodeFunctionResult.js"() {
    init_abi();
    init_decodeAbiParameters();
    init_getAbiItem();
    docsPath2 = "/docs/contract/decodeFunctionResult";
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/vendor/engine.cjs
var require_engine = __commonJS({
  "../../../../../../../../../ESIM\u5E02\u503C\u7EDF\u8BA1/\u5DE5\u7A0B/esim-daily-ledger/web/vendor/engine.cjs"(exports) {
    exports.createEngine = function() {
      var ESIM_CFG = { "chainId": 56, "network": "bnb-mainnet", "token": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "usdt": "0x55d398326f99059ff775485246999027b3197955", "timezone": "Asia/Shanghai", "start": "2026-09-30T08:00:00+08:00", "dailyStartHour": 8, "addresses": ["0x4b7d906b209f6cee02091d0139f105c08cb861fd", "0x4eb0621554a3e7619595bed6d16dd592179c2ec1", "0xac80c4ad44ae3386205f4972d1d95712d75fb66f", "0x0dadf9848667cd51ac9bddce543c4f70278e7150", "0x3759db8f9245291c5a710fdf807e95245e6c4122", "0xe86eaf59765d580a6daccf9644b9867aeed8a18c", "0x45a186cba397f354a85e50a33f7b7082c2784ac6", "0xc2b8f3c7db355bbe8d174909d921885d0cf45359", "0x5f714f871acf20cf797a362b7583b4cb0f0bdf24", "0x8bfa50a8973c9d859b01ce6c905ea3c0a0abaddf", "0xc5b5c9f4b80f0b345a06ba7970cc3b8995ed24a4", "0xeecd820601367bf3b8aaef68b4e85495b61007cf", "0x3ab32cfcacfedeaa42c0f0eb51158c56871f71b9", "0x2635f3fe2c6ec8720391f39b09001eddc63a1a23", "0x0946f6a9e3b006984bf9f2250e12b577ccb14909", "0x0d151c68690e7a5821bc7abab74db02a703fe582", "0x040d55a50378815bf23ea17ac81f4428af73ce24", "0xea4bd4aad512ca4dccda821e8693b6b38b51fc68", "0x435883e28439f909f68c536a0c9fc8a6f1248417", "0x41e0836726b37c670acf8bac9efa8964bfc737fe", "0x2aa283101c266cbc20a142ad161d59143112bfc1", "0xb8c7fdcf7e2ab23a231df904257ff59be53ed73d", "0xc40409aee5b913f14dfd8f967299ddf9dc5009a1", "0xe858154e5b1d0c295b24103dbc7671b67faccba3", "0xe8e15e97a8652ebdc8333007ea9d3b0275595d96", "0x85e471fd8abe8e0c6b6f6b4c635956020336a12e", "0xa6b9f2f8507c3dcee32f765361f2c5527d7b6ad6", "0xd21261df561825ef324bd4430487eac32a28a66a", "0x76f9b8a66780986688e265d9a0028623052176c1", "0x1db99241d9e230edc33996567ec2707c42475fd8", "0xdcdb497a0b2ab74753f8e40e36071ce7a0ab4930"], "inputAddresses": ["0x4B7d906b209f6cee02091d0139f105c08Cb861fd", "0x4EB0621554A3e7619595bED6D16dd592179c2ec1", "0xaC80C4Ad44aE3386205f4972d1d95712D75fb66f", "0x0DAdf9848667Cd51Ac9bdDCe543c4F70278e7150", "0x3759Db8f9245291C5A710fdF807e95245E6C4122", "0xe86eAF59765D580A6Daccf9644b9867AEED8a18c", "0x45a186cBA397f354a85e50A33f7B7082C2784AC6", "0xc2B8f3C7dB355BbE8d174909d921885d0Cf45359", "0x5f714F871acF20cf797a362B7583b4Cb0F0bdf24", "0x8bfa50A8973C9D859B01ce6c905ea3C0a0abadDf", "0xc5B5c9f4B80F0b345a06bA7970Cc3b8995ED24a4", "0xeecD820601367Bf3b8Aaef68b4E85495b61007CF", "0x3aB32CFCAcFeDEaa42c0f0eb51158C56871F71b9", "0x2635F3Fe2c6EC8720391f39b09001edDc63a1a23", "0x0946f6A9E3b006984bF9f2250e12b577ccB14909", "0x0D151c68690e7A5821Bc7abaB74Db02A703FE582", "0x040d55A50378815bF23EA17ac81F4428af73Ce24", "0xea4bD4AaD512CA4DCcDa821E8693B6b38B51fc68", "0x435883e28439F909F68C536a0C9Fc8A6F1248417", "0x41E0836726b37C670AcF8BAC9EfA8964Bfc737FE", "0x2Aa283101C266Cbc20A142Ad161D59143112bFc1", "0xb8C7FDCf7E2Ab23a231dF904257FF59Be53Ed73D", "0xc40409Aee5B913f14dfD8f967299ddf9dc5009a1", "0xE858154E5B1D0C295b24103DBc7671b67fACCba3", "0xE8e15e97A8652EbdC8333007eA9D3B0275595D96", "0x85E471Fd8AbE8e0c6B6F6b4C635956020336a12e", "0xA6b9f2f8507C3dcEe32f765361F2C5527D7B6Ad6", "0xD21261dF561825Ef324BD4430487eac32a28A66a", "0x76f9B8a66780986688e265D9a0028623052176C1", "0x1DB99241D9E230eDc33996567EC2707c42475fd8", "0x1DB99241D9E230eDc33996567EC2707c42475fd8", "0xdcDB497A0b2Ab74753f8E40e36071cE7a0aB4930"], "startDay": "2026-09-30", "startBoundary": { "time": "2026-09-30T08:00:00+08:00", "block": 124808836, "actualTime": "2026-09-30T07:59:59+08:00" }, "nftSeed": [], "referencePools": [{ "id": "0x082a0a013f0d9152e53e435b274276e798f75cd5", "token0": "0x4ef9d3062c7f6eba4aae4990c5036598c6eff4ec", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0x082a0a013f0d9152e53e435b274276e798f75cd5", "type": "classic", "swapCount": 1 }, { "id": "0x172fcd41e0913e95784454622d1c3724f546f849", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0x172fcd41e0913e95784454622d1c3724f546f849", "type": "classic", "swapCount": 29 }, { "id": "0x1e213600fa9317feac4ef4087acdf5d0e25d7187", "token0": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0x1e213600fa9317feac4ef4087acdf5d0e25d7187", "type": "classic", "swapCount": 1 }, { "id": "0x247f51881d1e3ae0f759afb801413a6c948ef442", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", "manager": "0x247f51881d1e3ae0f759afb801413a6c948ef442", "type": "classic", "swapCount": 2 }, { "id": "0x3b2b70dd9684deee3f942653a418be34fc0d525b", "token0": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "token1": "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", "manager": "0x3b2b70dd9684deee3f942653a418be34fc0d525b", "type": "classic", "swapCount": 1 }, { "id": "0x3c519f6bb91158a4148b276baa2d4fe3e8a26614", "token0": "0x4ef9d3062c7f6eba4aae4990c5036598c6eff4ec", "token1": "0x55d398326f99059ff775485246999027b3197955", "manager": "0x3c519f6bb91158a4148b276baa2d4fe3e8a26614", "type": "classic", "swapCount": 1 }, { "id": "0x4141325bac36affe9db165e854982230a14e6d48", "token0": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0x4141325bac36affe9db165e854982230a14e6d48", "type": "classic", "swapCount": 1 }, { "id": "0x51472df7d3c9a02a912f2473960ef835ff1e9a42", "token0": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "token1": "0xbe9d156892e55e7154bcd3cb0fea677f9d3103e1", "manager": "0x51472df7d3c9a02a912f2473960ef835ff1e9a42", "type": "classic", "swapCount": 2 }, { "id": "0x62edaf2a56c9fb55be5f9b1399ac067f6a37013b", "token0": "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0x62edaf2a56c9fb55be5f9b1399ac067f6a37013b", "type": "classic", "swapCount": 1 }, { "id": "0x62fcb3c1794fb95bd8b1a97f6ad5d8a7e4943a1e", "token0": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0x62fcb3c1794fb95bd8b1a97f6ad5d8a7e4943a1e", "type": "classic", "swapCount": 3 }, { "id": "0x7213a321f1855cf1779f42c0cd85d3d95291d34c", "token0": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "token1": "0xe9e7cea3dedca5984780bafc599bd69add087d56", "manager": "0x7213a321f1855cf1779f42c0cd85d3d95291d34c", "type": "classic", "swapCount": 1 }, { "id": "0x783a3d7c3236cf05f103adc890377f5984d694e5", "token0": "0x4902c5ebc598265ed2212b559b042de8a5eeec3f", "token1": "0x7c8d5502b544ddaf8852fc46d1174e34876d545c", "manager": "0x783a3d7c3236cf05f103adc890377f5984d694e5", "type": "classic", "swapCount": 1 }, { "id": "0x9f599f3d64a9d99ea21e68127bb6ce99f893da61", "token0": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "token1": "0x55d398326f99059ff775485246999027b3197955", "manager": "0x9f599f3d64a9d99ea21e68127bb6ce99f893da61", "type": "classic", "swapCount": 2 }, { "id": "0xafb2da14056725e3ba3a30dd846b6bbbd7886c56", "token0": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0xafb2da14056725e3ba3a30dd846b6bbbd7886c56", "type": "classic", "swapCount": 1 }, { "id": "0xbf4dc3116ba2490ba860849b2cd3399932e843bc", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "manager": "0xbf4dc3116ba2490ba860849b2cd3399932e843bc", "type": "classic", "swapCount": 108 }, { "id": "0xc53e634836e95cda2857e2fbd3eaf2f7f63cf832", "token0": "0x4902c5ebc598265ed2212b559b042de8a5eeec3f", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0xc53e634836e95cda2857e2fbd3eaf2f7f63cf832", "type": "classic", "swapCount": 1 }, { "id": "0xcaaf3c41a40103a23eeaa4bba468af3cf5b0e0d8", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0xcae117ca6bc8a341d2e7207f30e180f0e5618b9d", "manager": "0xcaaf3c41a40103a23eeaa4bba468af3cf5b0e0d8", "type": "classic", "swapCount": 2 }, { "id": "0xcd06956a47164ea866c3e9601085777e89cffad5", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "manager": "0xcd06956a47164ea866c3e9601085777e89cffad5", "type": "classic", "swapCount": 585 }, { "id": "0xe2b7b3e9171e5f9693f4d9304177fa4b129d0bca", "token0": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "token1": "0xe9e7cea3dedca5984780bafc599bd69add087d56", "manager": "0xe2b7b3e9171e5f9693f4d9304177fa4b129d0bca", "type": "classic", "swapCount": 1 }, { "id": "0xeb7528398b2725e1e0374734a87320132223a5c6", "token0": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", "token1": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "manager": "0xeb7528398b2725e1e0374734a87320132223a5c6", "type": "classic", "swapCount": 1 }, { "id": "0xf2688fb5b81049dfb7703ada5e770543770612c4", "token0": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0xf2688fb5b81049dfb7703ada5e770543770612c4", "type": "classic", "swapCount": 3 }, { "id": "0x118c0dbba8ece2c060b050e14a94e7e5e97dcdc023325f0dcfcfeb7c0f7130d3", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 1 }, { "id": "0x24d01c45d3fc828e99c6c34cf6ddb9a39260b7fb2bc849833195caac3c987176", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 2864 }, { "id": "0x258907d03806aad208f23147bf05d4e5f69eaba5c6ded94f02d98445add62c31", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 1 }, { "id": "0x32a805e65a3219a79707ab3e75443d75160d798de46613fc960d39cd4a96bb22", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 2 }, { "id": "0x5826c5bd582f96f018219f91559c50ad17067bb421ed305d69763d7065b8432b", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 5 }, { "id": "0x767e8e440c8ec7ac01fddee3cea2e40931538a1375493aa2d510dd39c6d9b998", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 39 }, { "id": "0x81c144e9e30c6ca0f1501d04b107137a6862698d1f54abc16bf5d015cff35c4f", "token0": "0x0000000000000000000000000000000000000000", "token1": "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 2 }, { "id": "0x8cbeeb68dd5de3355a7be1249d44b4fba14521da76ee649b2a291de1afd684ed", "token0": "0x0000000000000000000000000000000000000000", "token1": "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 1 }, { "id": "0xd37aa0f0d66ad670279f6b89325c88bdff17d0265144762fb01f54fca9779944", "token0": "0x0000000000000000000000000000000000000000", "token1": "0x55d398326f99059ff775485246999027b3197955", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 1 }, { "id": "0xdc85783e828973a0a9f0013fb2fc5ed841765c4e9ef7deaf719a4745d37f422e", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7c8d5502b544ddaf8852fc46d1174e34876d545c", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 1 }, { "id": "0xf126c8e4f74ace95628ec14a496e3a8bbb5f16ef9ee908359e0c4b9018d0356f", "token0": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "token1": "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d", "manager": "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b", "type": "infinity", "swapCount": 1 }, { "id": "0x8321c1f53959b14ece4b5400e60aeac59e7b6b8bac446f2f0a89b9e84e68a08a", "poolId": "0x8321c1f53959b14ece4b5400e60aeac59e7b6b8bac446f2f0a89b9e84e68a08a", "manager": "0x28e2ea090877bf75740558f6bfb36a5ffee9e9df", "type": "uniswap-v4", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "fee": 1, "tickSpacing": 1, "hooks": "0x0000000000000000000000000000000000000000", "poolKey": "0x00000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000", "verification": { "transactionHash": "0x9160bf6c1f1279b073967f3dfe23bf7baacbf29559a13fc6150470d3b50d2e95", "block": 126564647, "logIndex": 11, "method": "Successful callTracer swap PoolKey ABI keccak equals receipt Swap poolId", "poolKeyHash": "0x8321c1f53959b14ece4b5400e60aeac59e7b6b8bac446f2f0a89b9e84e68a08a" }, "swapCount": 2 }, { "id": "0x1bb9710a71ec152e7b57de9df46e33b76690b992f283b360782721f18e0869b2", "poolId": "0x1bb9710a71ec152e7b57de9df46e33b76690b992f283b360782721f18e0869b2", "manager": "0x28e2ea090877bf75740558f6bfb36a5ffee9e9df", "type": "uniswap-v4", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "fee": 1, "tickSpacing": 1, "hooks": "0x0000000000000000000000000000000000000000", "poolKey": "0x00000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000007765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000", "verification": { "transactionHash": "0x1754638837503ebbd8473580a51c60a7af952ec58ca81a1512f8c8d71e97cdec", "block": 128281528, "logIndex": 241, "method": "Successful callTracer swap PoolKey ABI keccak equals receipt Swap poolId", "poolKeyHash": "0x1bb9710a71ec152e7b57de9df46e33b76690b992f283b360782721f18e0869b2" }, "swapCount": 1 }, { "id": "0xf8c7b3c122f31aec155c6beb0c1c78a5e74208358a840cadfbc6129b59391850", "poolId": "0xf8c7b3c122f31aec155c6beb0c1c78a5e74208358a840cadfbc6129b59391850", "manager": "0x28e2ea090877bf75740558f6bfb36a5ffee9e9df", "type": "uniswap-v4", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "fee": 6, "tickSpacing": 1, "hooks": "0x0000000000000000000000000000000000000000", "poolKey": "0x00000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000", "verification": { "transactionHash": "0x54bec96ea1ba94b3405e32bbe21e02a51a245c01062c181b8dbf62c604bf069f", "block": 126630871, "logIndex": 58, "tracePath": [2, 0, 1, 2, 1, 0, 3], "method": "Successful cached callTracer swap PoolKey ABI keccak equals receipt Swap poolId", "poolKeyHash": "0xf8c7b3c122f31aec155c6beb0c1c78a5e74208358a840cadfbc6129b59391850" } }, { "id": "0x93efe26bb57852dcba5ab7b389be998f9a823b0024c0de1d8613e6e3244036c4", "poolId": "0x93efe26bb57852dcba5ab7b389be998f9a823b0024c0de1d8613e6e3244036c4", "manager": "0x28e2ea090877bf75740558f6bfb36a5ffee9e9df", "type": "uniswap-v4", "token0": "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", "token1": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "fee": 3e3, "tickSpacing": 60, "hooks": "0x0000000000000000000000000000000000000000", "poolKey": "0x0000000000000000000000007130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c0000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d0000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000000003c0000000000000000000000000000000000000000000000000000000000000000", "verification": { "transactionHash": "0x4e18d8712884c16ff4dc8df1aed4c8c36e2611504f664c8143c3226378d4331d", "block": 128956678, "logIndex": 373, "tracePath": [2, 3, 0, 3], "method": "Successful cached callTracer swap PoolKey ABI keccak equals receipt Swap poolId", "poolKeyHash": "0x93efe26bb57852dcba5ab7b389be998f9a823b0024c0de1d8613e6e3244036c4" } }, { "id": "0x628ea54a6450645d2bb7b2911c8c6f3d7f3944c2f4703c259a1b85bf5569870b", "poolId": "0x628ea54a6450645d2bb7b2911c8c6f3d7f3944c2f4703c259a1b85bf5569870b", "manager": "0x28e2ea090877bf75740558f6bfb36a5ffee9e9df", "type": "uniswap-v4", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "fee": 2, "tickSpacing": 1, "hooks": "0x0000000000000000000000000000000000000000", "poolKey": "0x00000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000", "verification": { "transactionHash": "0x4e18d8712884c16ff4dc8df1aed4c8c36e2611504f664c8143c3226378d4331d", "block": 128956678, "logIndex": 370, "tracePath": [2, 1, 0, 3], "method": "Successful cached callTracer swap PoolKey ABI keccak equals receipt Swap poolId", "poolKeyHash": "0x628ea54a6450645d2bb7b2911c8c6f3d7f3944c2f4703c259a1b85bf5569870b" } }, { "id": "0x47a90a2d92a8367a91efa1906bfc8c1e05bf10c4", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "manager": "0x47a90a2d92a8367a91efa1906bfc8c1e05bf10c4", "type": "classic", "swapCount": 1 }, { "id": "0xac7011a0d0cfde1b06363f2141df9ae5da139759", "token0": "0x55d398326f99059ff775485246999027b3197955", "token1": "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d", "manager": "0xac7011a0d0cfde1b06363f2141df9ae5da139759", "type": "classic", "swapCount": 0 }, { "id": "0xe1cc96f3ef3bc6a82140bfdf19124223e4a5d906", "token0": "0x544028231562a43b106fbceca722b65cb5c861b0", "token1": "0xf7c736310a1a89b82257443960b372af74632dfe", "manager": "0xe1cc96f3ef3bc6a82140bfdf19124223e4a5d906", "type": "classic", "swapCount": 1 }], "verifiedNonEsimResolutions": [{ "hash": "0x9de80551077e65d2bb1f135f4713e20f8ce7fc62ed00f02094349bb2f9100a4a", "wallet": "0x3ab32cfcacfedeaa42c0f0eb51158c56871f71b9", "chainId": 56, "blockHash": "0x484e20e1a90ca147f2f38a66c49f51c65c3d0ddbcfa71b3ef0e9d53f0aa7c20a", "blockNumber": 128852827, "expectedUSDTraw": "-2075420520015869105", "expectedBNBraw": "2685372145470412", "type": "\u975EESIM\u5151\u6362\u53CA\u8D39\u7528", "reason": "\u5DF2\u9010\u7B14\u6838\u5B9E\u4EA4\u6613\u56DE\u6267\u3001\u6210\u529F\u8C03\u7528\u8DEF\u5F84\u53CA\u539F\u59CB\u6574\u6570\uFF1A\u4ED8\u51FA 2 USDT\uFF0C\u6536\u5230 0.002685372145470412 BNB\uFF1B\u4E0D\u6D89\u53CA ESIM \u4E70\u5356\u6216 LP\u3002\u8DEF\u7531\u7559\u5B58 0.006 USDT \u5DF2\u5305\u542B\u5728\u4E0A\u8FF0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u80FD\u91CD\u590D\u6263\u51CF\u3002\u53E6\u6709 0.075420520015869105 USDT \u6263\u81F3 UserOperation \u4E8B\u4EF6\u4E2D\u7684\u4EE3\u4ED8\u5730\u5740 0x7a956fd329d0c616f2d1dde98bb35694f397df46\uFF1B\u5DF2\u8BA1\u5165\u5B9E\u9645 U \u6536\u652F\uFF0C\u4F46\u4E0D\u6DF7\u5165\u5151\u6362\u672C\u91D1\u3002\u5177\u4F53\u6536\u8D39\u89C4\u5219\u672A\u786E\u8BA4\u3002\u94B1\u5305\u4F59\u989D\u3001Gas \u4E0E\u539F\u6709 ESIM \u4E70\u5356\u91D1\u989D\u4FDD\u6301\u4E0D\u53D8\u3002", "evidence": [{ "sourceFile": "resolutions-five.json", "sourceSHA256": "1561879e5e1c8b152265b5a55979a772a2cd122139048f1e7c2f592893a606c8", "receiptAndTrace": { "status": "fresh-receipt-and-callTracer-match", "checkedAt": "2026-10-26T06:35:26.513233+00:00", "chainId": 56, "receiptSHA256": "72f3c865494d5befcbbc9763f11a2f80cbfe1e87993a3c0df5f7579020aa61aa", "traceSHA256": "fcc141fd465c939849ac9279f48d1575666e10e874497b4a7538fed0f16d8340", "matchesPriorCache": true, "rpcMethods": ["eth_getTransactionReceipt", "debug_traceTransaction"], "sourceCount": 1, "independentEvidenceTypes": 2, "limitation": "One configured RPC provider; receipt logs and successful callTracer are two evidence types, not two independent providers." }, "transactionURL": "https://bscscan.com/tx/0x9de80551077e65d2bb1f135f4713e20f8ce7fc62ed00f02094349bb2f9100a4a", "grossInput": { "asset": "USDT", "amountRaw": "2000000000000000000" }, "output": { "asset": "BNB", "amountRaw": "2685372145470412" }, "routerRetainedIncludedInInput": { "asset": "USDT", "amountRaw": "6000000000000000" }, "extraPaymasterDebit": { "asset": "USDT", "amountRaw": "75420520015869105", "recipient": "0x7a956fd329d0c616f2d1dde98bb35694f397df46" }, "evidenceBoundary": "One RPC provider; successful receipt logs and call trace. Exact transaction only; no ownership or fee-policy inference." }], "day": "2026-10-21", "time": "2026-10-21T09:48:55+08:00" }, { "hash": "0x4e18d8712884c16ff4dc8df1aed4c8c36e2611504f664c8143c3226378d4331d", "wallet": "0xc2b8f3c7db355bbe8d174909d921885d0cf45359", "chainId": 56, "blockHash": "0xbb765d9e0eb829ea4c09e809be910ac89413b506312a418889dc3372bbe0a430", "blockNumber": 128956678, "expectedUSDTraw": "-2000000000000000000", "expectedBNBraw": "2665142864832233", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u9010\u7B14\u6838\u5B9E\u4EA4\u6613\u56DE\u6267\u3001\u6210\u529F\u8C03\u7528\u8DEF\u5F84\u53CA\u539F\u59CB\u6574\u6570\uFF1A\u4ED8\u51FA 2 USDT\uFF0C\u6536\u5230 0.002665142864832233 BNB\uFF1B\u4E0D\u6D89\u53CA ESIM \u4E70\u5356\u6216 LP\u3002\u8DEF\u7531\u7559\u5B58 0.006 USDT \u5DF2\u5305\u542B\u5728\u4E0A\u8FF0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u80FD\u91CD\u590D\u6263\u51CF\u3002\u94B1\u5305\u4F59\u989D\u3001Gas \u4E0E\u539F\u6709 ESIM \u4E70\u5356\u91D1\u989D\u4FDD\u6301\u4E0D\u53D8\u3002", "evidence": [{ "sourceFile": "resolutions-five.json", "sourceSHA256": "1561879e5e1c8b152265b5a55979a772a2cd122139048f1e7c2f592893a606c8", "receiptAndTrace": { "status": "fresh-receipt-and-callTracer-match", "checkedAt": "2026-10-26T06:35:26.513233+00:00", "chainId": 56, "receiptSHA256": "b11090142ddded5b7fbd808c6eac48f275969b64b77fee71fbff9b5887ea3fc1", "traceSHA256": "a95b0c4989582586d086d310ddab6ce2c99da9dea6d5778c3e413d07e24b89a7", "matchesPriorCache": true, "rpcMethods": ["eth_getTransactionReceipt", "debug_traceTransaction"], "sourceCount": 1, "independentEvidenceTypes": 2, "limitation": "One configured RPC provider; receipt logs and successful callTracer are two evidence types, not two independent providers." }, "transactionURL": "https://bscscan.com/tx/0x4e18d8712884c16ff4dc8df1aed4c8c36e2611504f664c8143c3226378d4331d", "grossInput": { "asset": "USDT", "amountRaw": "2000000000000000000" }, "output": { "asset": "BNB", "amountRaw": "2665142864832233" }, "routerRetainedIncludedInInput": { "asset": "USDT", "amountRaw": "6000000000000000" }, "extraPaymasterDebit": { "asset": "USDT", "amountRaw": "0", "recipient": null }, "evidenceBoundary": "One RPC provider; successful receipt logs and call trace. Exact transaction only; no ownership or fee-policy inference." }], "day": "2026-10-21", "time": "2026-10-21T22:48:06+08:00" }, { "hash": "0xde3c8ccab95c727c36f79ee15f8b2c6786fa17ed4866fba3a3adfa30d8c826f4", "wallet": "0x45a186cba397f354a85e50a33f7b7082c2784ac6", "chainId": 56, "blockHash": "0x08f87f83f86a612839a8ef32a12282809447e11d26aa91f350f89bcdcd615243", "blockNumber": 129070736, "expectedUSDTraw": "-1000000000000000000", "expectedBNBraw": "1345401606380498", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u9010\u7B14\u6838\u5B9E\u4EA4\u6613\u56DE\u6267\u3001\u6210\u529F\u8C03\u7528\u8DEF\u5F84\u53CA\u539F\u59CB\u6574\u6570\uFF1A\u4ED8\u51FA 1 USDT\uFF0C\u6536\u5230 0.001345401606380498 BNB\uFF1B\u4E0D\u6D89\u53CA ESIM \u4E70\u5356\u6216 LP\u3002\u8DEF\u7531\u7559\u5B58 0.003 USDT \u5DF2\u5305\u542B\u5728\u4E0A\u8FF0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u80FD\u91CD\u590D\u6263\u51CF\u3002\u94B1\u5305\u4F59\u989D\u3001Gas \u4E0E\u539F\u6709 ESIM \u4E70\u5356\u91D1\u989D\u4FDD\u6301\u4E0D\u53D8\u3002", "evidence": [{ "sourceFile": "resolutions-five.json", "sourceSHA256": "1561879e5e1c8b152265b5a55979a772a2cd122139048f1e7c2f592893a606c8", "receiptAndTrace": { "status": "fresh-receipt-and-callTracer-match", "checkedAt": "2026-10-26T06:35:26.513233+00:00", "chainId": 56, "receiptSHA256": "23a7e5cee672d357080fc9e59f0724e49af6cbaabf9e181cd80970f74a7544a7", "traceSHA256": "afc6be8ac113f9b8dd434119610089f15be53eac0c26ad9a0d94ddf0681783f1", "matchesPriorCache": true, "rpcMethods": ["eth_getTransactionReceipt", "debug_traceTransaction"], "sourceCount": 1, "independentEvidenceTypes": 2, "limitation": "One configured RPC provider; receipt logs and successful callTracer are two evidence types, not two independent providers." }, "transactionURL": "https://bscscan.com/tx/0xde3c8ccab95c727c36f79ee15f8b2c6786fa17ed4866fba3a3adfa30d8c826f4", "grossInput": { "asset": "USDT", "amountRaw": "1000000000000000000" }, "output": { "asset": "BNB", "amountRaw": "1345401606380498" }, "routerRetainedIncludedInInput": { "asset": "USDT", "amountRaw": "3000000000000000" }, "extraPaymasterDebit": { "asset": "USDT", "amountRaw": "0", "recipient": null }, "evidenceBoundary": "One RPC provider; successful receipt logs and call trace. Exact transaction only; no ownership or fee-policy inference." }], "day": "2026-10-22", "time": "2026-10-22T13:03:55+08:00" }, { "hash": "0x2d8dcc318e018a448a07a18c5dd4a23ca6ca9d0f176e83991489ae51d7127559", "wallet": "0xe86eaf59765d580a6daccf9644b9867aeed8a18c", "chainId": 56, "blockHash": "0x94f81415d35ce7a7f67c5128b513ff65e37d83aaa928a5592099dba23455de0c", "blockNumber": 129087217, "expectedUSDTraw": "728277494357338733998", "expectedBNBraw": "-990000000000000000", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u9010\u7B14\u6838\u5B9E\u4EA4\u6613\u56DE\u6267\u3001\u6210\u529F\u8C03\u7528\u8DEF\u5F84\u53CA\u539F\u59CB\u6574\u6570\uFF1A\u4ED8\u51FA 0.99 BNB\uFF0C\u6536\u5230 728.277494357338733998 USDT\uFF1B\u4E0D\u6D89\u53CA ESIM \u4E70\u5356\u6216 LP\u3002\u8DEF\u7531\u7559\u5B58 0.00297 BNB \u5DF2\u5305\u542B\u5728\u4E0A\u8FF0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u80FD\u91CD\u590D\u6263\u51CF\u3002\u94B1\u5305\u4F59\u989D\u3001Gas \u4E0E\u539F\u6709 ESIM \u4E70\u5356\u91D1\u989D\u4FDD\u6301\u4E0D\u53D8\u3002", "evidence": [{ "sourceFile": "resolutions-two.json", "sourceSHA256": "d38403415b84c12960c033c21942453539c42c29f778dd25db7c177f591b26b0", "receiptAndTrace": { "freshNetworkRead": true, "retrievedAt": "2026-10-26T06:35:54.301403+00:00", "chainId": 56, "methods": ["eth_getTransactionByHash", "eth_getTransactionReceipt", "debug_traceTransaction"], "sha256": { "eth_getTransactionByHash": "83feb1a97e2946a5c7c35309294f8362db058e0506592163b069805864ef7977", "eth_getTransactionReceipt": "584b5736549358f75ebeee7a08c5b00e904b14abb7407d540eafd81d728e5274", "debug_traceTransaction": "56e1ccd89184fe807c7e4ad44820c2319ad087a854a7a19bd24997c111927673" }, "cacheIdentical": { "eth_getTransactionByHash": false, "eth_getTransactionReceipt": true, "debug_traceTransaction": true }, "coreFieldsIdentical": true, "optionalMetadataDifference": { "field": "eth_getTransactionByHash.blockTimestamp", "cached": null, "fresh": "0x6ad9b637", "crossCheck": "matches every receipt log blockTimestamp" } }, "transactionURL": "https://bscscan.com/tx/0x2d8dcc318e018a448a07a18c5dd4a23ca6ca9d0f176e83991489ae51d7127559", "grossInput": { "asset": "BNB", "amountRaw": "990000000000000000" }, "output": { "asset": "USDT", "amountRaw": "728277494357338733998" }, "routerRetainedIncludedInInput": { "asset": "BNB", "amountRaw": "2970000000000000" }, "extraPaymasterDebit": { "asset": "USDT", "amountRaw": "0", "recipient": null }, "evidenceBoundary": "One RPC provider; successful receipt logs and call trace. Exact transaction only; no ownership or fee-policy inference." }], "day": "2026-10-22", "time": "2026-10-22T15:07:35+08:00" }, { "hash": "0x13f7e126d881bb246093f93537d7fcad33bd1c6ceca2977dea2fabd5c749b604", "wallet": "0x0dadf9848667cd51ac9bddce543c4f70278e7150", "chainId": 56, "blockHash": "0x8038b93a1b784b7b15f9c24e6d33911ba3d3da80cbcd83206bf3ef9333940e12", "blockNumber": 129468810, "expectedUSDTraw": "-1083466904634631375", "expectedBNBraw": "1351289416337449", "type": "\u975EESIM\u5151\u6362\u53CA\u8D39\u7528", "reason": "\u5DF2\u9010\u7B14\u6838\u5B9E\u4EA4\u6613\u56DE\u6267\u3001\u6210\u529F\u8C03\u7528\u8DEF\u5F84\u53CA\u539F\u59CB\u6574\u6570\uFF1A\u4ED8\u51FA 1 USDT\uFF0C\u6536\u5230 0.001351289416337449 BNB\uFF1B\u4E0D\u6D89\u53CA ESIM \u4E70\u5356\u6216 LP\u3002\u8DEF\u7531\u7559\u5B58 0.003 USDT \u5DF2\u5305\u542B\u5728\u4E0A\u8FF0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u80FD\u91CD\u590D\u6263\u51CF\u3002\u53E6\u6709 0.083466904634631375 USDT \u6263\u81F3 UserOperation \u4E8B\u4EF6\u4E2D\u7684\u4EE3\u4ED8\u5730\u5740 0x7a956fd329d0c616f2d1dde98bb35694f397df46\uFF1B\u5DF2\u8BA1\u5165\u5B9E\u9645 U \u6536\u652F\uFF0C\u4F46\u4E0D\u6DF7\u5165\u5151\u6362\u672C\u91D1\u3002\u5177\u4F53\u6536\u8D39\u89C4\u5219\u672A\u786E\u8BA4\u3002\u94B1\u5305\u4F59\u989D\u3001Gas \u4E0E\u539F\u6709 ESIM \u4E70\u5356\u91D1\u989D\u4FDD\u6301\u4E0D\u53D8\u3002", "evidence": [{ "sourceFile": "resolutions-two.json", "sourceSHA256": "d38403415b84c12960c033c21942453539c42c29f778dd25db7c177f591b26b0", "receiptAndTrace": { "freshNetworkRead": true, "retrievedAt": "2026-10-26T06:35:56.557926+00:00", "chainId": 56, "methods": ["eth_getTransactionByHash", "eth_getTransactionReceipt", "debug_traceTransaction"], "sha256": { "eth_getTransactionByHash": "dedf49b1133412cd9f16e22d0161eed066674811f3ab8238496cde5e89f9c695", "eth_getTransactionReceipt": "a0e478ff09b37764a27db13c83dfae2f300b78b831b1683d55645b79063178a1", "debug_traceTransaction": "7a36b98862871f4a3f1ffda52ce2e0cafe6d41712110e54018ff424afec1f677" }, "cacheIdentical": { "eth_getTransactionByHash": true, "eth_getTransactionReceipt": true, "debug_traceTransaction": true }, "coreFieldsIdentical": true, "optionalMetadataDifference": null }, "transactionURL": "https://bscscan.com/tx/0x13f7e126d881bb246093f93537d7fcad33bd1c6ceca2977dea2fabd5c749b604", "grossInput": { "asset": "USDT", "amountRaw": "1000000000000000000" }, "output": { "asset": "BNB", "amountRaw": "1351289416337449" }, "routerRetainedIncludedInInput": { "asset": "USDT", "amountRaw": "3000000000000000" }, "extraPaymasterDebit": { "asset": "USDT", "amountRaw": "83466904634631375", "recipient": "0x7a956fd329d0c616f2d1dde98bb35694f397df46" }, "evidenceBoundary": "One RPC provider; successful receipt logs and call trace. Exact transaction only; no ownership or fee-policy inference." }], "day": "2026-10-24", "time": "2026-10-24T14:50:22+08:00" }, { "hash": "0xfcd4996c0efb475f3fe6d66f16f20ea1983fc41ef5b45143d7270a38c40f5bb7", "wallet": "0x3759db8f9245291c5a710fdf807e95245e6c4122", "chainId": 56, "blockHash": "0x7a9cdcff27ebed6d8119a864739b69113e7a6ccc39f009bfabfb0165ab021ef5", "blockNumber": 129574278, "expectedUSDTraw": "-1000000000000000000", "expectedBNBraw": "1365396044718319", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u9010\u7B14\u6838\u5B9E\u4EA4\u6613\u56DE\u6267\u3001\u6210\u529F\u8C03\u7528\u8DEF\u5F84\u53CA\u539F\u59CB\u6574\u6570\uFF1A\u4ED8\u51FA 1 USDT\uFF0C\u6536\u5230 0.001365396044718319 BNB\uFF1B\u4E0D\u6D89\u53CA ESIM \u4E70\u5356\u6216 LP\u3002\u8DEF\u7531\u7559\u5B58 0.003 USDT \u5DF2\u5305\u542B\u5728\u4E0A\u8FF0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u80FD\u91CD\u590D\u6263\u51CF\u3002\u94B1\u5305\u4F59\u989D\u3001Gas \u4E0E\u539F\u6709 ESIM \u4E70\u5356\u91D1\u989D\u4FDD\u6301\u4E0D\u53D8\u3002", "evidence": [{ "sourceFile": "resolutions-five.json", "sourceSHA256": "1561879e5e1c8b152265b5a55979a772a2cd122139048f1e7c2f592893a606c8", "receiptAndTrace": { "status": "fresh-receipt-and-callTracer-match", "checkedAt": "2026-10-26T06:35:26.513233+00:00", "chainId": 56, "receiptSHA256": "f3ba181a56a75e1d65df9fc1b11311f338da09a7873e5154f47ab0ba2a6869f7", "traceSHA256": "67def36e127ca1f9f67b47c8e7a8f7a92a300f4b1a05626ff40a80c5d40c6dc3", "matchesPriorCache": true, "rpcMethods": ["eth_getTransactionReceipt", "debug_traceTransaction"], "sourceCount": 1, "independentEvidenceTypes": 2, "limitation": "One configured RPC provider; receipt logs and successful callTracer are two evidence types, not two independent providers." }, "transactionURL": "https://bscscan.com/tx/0xfcd4996c0efb475f3fe6d66f16f20ea1983fc41ef5b45143d7270a38c40f5bb7", "grossInput": { "asset": "USDT", "amountRaw": "1000000000000000000" }, "output": { "asset": "BNB", "amountRaw": "1365396044718319" }, "routerRetainedIncludedInInput": { "asset": "USDT", "amountRaw": "3000000000000000" }, "extraPaymasterDebit": { "asset": "USDT", "amountRaw": "0", "recipient": null }, "evidenceBoundary": "One RPC provider; successful receipt logs and call trace. Exact transaction only; no ownership or fee-policy inference." }], "day": "2026-10-24", "time": "2026-10-25T04:01:37+08:00" }, { "hash": "0x8a9492f95f67e924118935d2a1f6aa5af9f909f0cb98ed61217b52e6978e98f6", "wallet": "0x45a186cba397f354a85e50a33f7b7082c2784ac6", "chainId": 56, "blockHash": "0xb9c489f92106ec6af60ff7dbb4290aecf97bf2ad19c900dde8db24b073d6e7ca", "blockNumber": 129830365, "expectedUSDTraw": "-1000000000000000000", "expectedBNBraw": "1350437605501286", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u9010\u7B14\u6838\u5B9E\u4EA4\u6613\u56DE\u6267\u3001\u6210\u529F\u8C03\u7528\u8DEF\u5F84\u53CA\u539F\u59CB\u6574\u6570\uFF1A\u4ED8\u51FA 1 USDT\uFF0C\u6536\u5230 0.001350437605501286 BNB\uFF1B\u4E0D\u6D89\u53CA ESIM \u4E70\u5356\u6216 LP\u3002\u8DEF\u7531\u7559\u5B58 0.003 USDT \u5DF2\u5305\u542B\u5728\u4E0A\u8FF0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u80FD\u91CD\u590D\u6263\u51CF\u3002\u94B1\u5305\u4F59\u989D\u3001Gas \u4E0E\u539F\u6709 ESIM \u4E70\u5356\u91D1\u989D\u4FDD\u6301\u4E0D\u53D8\u3002", "evidence": [{ "sourceFile": "resolutions-five.json", "sourceSHA256": "1561879e5e1c8b152265b5a55979a772a2cd122139048f1e7c2f592893a606c8", "receiptAndTrace": { "status": "fresh-receipt-and-callTracer-match", "checkedAt": "2026-10-26T06:35:26.513233+00:00", "chainId": 56, "receiptSHA256": "e1e1f4021c494d3c90da199880af4552908229be1fb600f1f5607502cb79e7f5", "traceSHA256": "8579b7ac8e3acf6d53f1e0b7eeb18987068d342b8969ac4d94e86c49ffce07fc", "matchesPriorCache": true, "rpcMethods": ["eth_getTransactionReceipt", "debug_traceTransaction"], "sourceCount": 1, "independentEvidenceTypes": 2, "limitation": "One configured RPC provider; receipt logs and successful callTracer are two evidence types, not two independent providers." }, "transactionURL": "https://bscscan.com/tx/0x8a9492f95f67e924118935d2a1f6aa5af9f909f0cb98ed61217b52e6978e98f6", "grossInput": { "asset": "USDT", "amountRaw": "1000000000000000000" }, "output": { "asset": "BNB", "amountRaw": "1350437605501286" }, "routerRetainedIncludedInInput": { "asset": "USDT", "amountRaw": "3000000000000000" }, "extraPaymasterDebit": { "asset": "USDT", "amountRaw": "0", "recipient": null }, "evidenceBoundary": "One RPC provider; successful receipt logs and call trace. Exact transaction only; no ownership or fee-policy inference." }], "day": "2026-10-26", "time": "2026-10-26T12:04:01+08:00" }], "nftSeedAddresses": ["0x4b7d906b209f6cee02091d0139f105c08cb861fd", "0x4eb0621554a3e7619595bed6d16dd592179c2ec1", "0xac80c4ad44ae3386205f4972d1d95712d75fb66f", "0x0dadf9848667cd51ac9bddce543c4f70278e7150", "0x3759db8f9245291c5a710fdf807e95245e6c4122", "0xe86eaf59765d580a6daccf9644b9867aeed8a18c", "0x45a186cba397f354a85e50a33f7b7082c2784ac6", "0xc2b8f3c7db355bbe8d174909d921885d0cf45359", "0x5f714f871acf20cf797a362b7583b4cb0f0bdf24", "0x8bfa50a8973c9d859b01ce6c905ea3c0a0abaddf", "0xc5b5c9f4b80f0b345a06ba7970cc3b8995ed24a4", "0xeecd820601367bf3b8aaef68b4e85495b61007cf", "0x3ab32cfcacfedeaa42c0f0eb51158c56871f71b9", "0x2635f3fe2c6ec8720391f39b09001eddc63a1a23", "0x0946f6a9e3b006984bf9f2250e12b577ccb14909", "0x0d151c68690e7a5821bc7abab74db02a703fe582", "0x040d55a50378815bf23ea17ac81f4428af73ce24", "0xea4bd4aad512ca4dccda821e8693b6b38b51fc68", "0x435883e28439f909f68c536a0c9fc8a6f1248417", "0x41e0836726b37c670acf8bac9efa8964bfc737fe", "0x2aa283101c266cbc20a142ad161d59143112bfc1", "0xb8c7fdcf7e2ab23a231df904257ff59be53ed73d", "0xc40409aee5b913f14dfd8f967299ddf9dc5009a1", "0xe858154e5b1d0c295b24103dbc7671b67faccba3", "0xe8e15e97a8652ebdc8333007ea9d3b0275595d96", "0x85e471fd8abe8e0c6b6f6b4c635956020336a12e", "0xa6b9f2f8507c3dcee32f765361f2c5527d7b6ad6", "0xd21261df561825ef324bd4430487eac32a28a66a", "0x76f9b8a66780986688e265d9a0028623052176c1", "0x1db99241d9e230edc33996567ec2707c42475fd8", "0xdcdb497a0b2ab74753f8e40e36071ce7a0ab4930"], "addressRegistrySheetId": 2601005, "schemaVersion": 2, "spreadsheetId": "1gv68oBO-tO-EPjT51Z-z_hxde2jS7soU0kJNKIZLXWM", "folderId": "1taeQpyRMylhDPhR9g995CbuW1JC_F-lg", "dailySheetId": 2601003, "detailSheetId": 2601004 };
      var ESIM_SIGNATURES = { "v2swap": "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822", "v3swap": "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67", "pcsv3swap": "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83", "infswap": "0x04206ad2b7c0f463bff3dd4f33c5735b0f2957a351e4f79763a4fa9e775dd237", "uniswap": "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f", "inflp": "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec", "v3mint": "0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde", "v3burn": "0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c", "v3collect": "0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0", "v2mint": "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f", "v2burn": "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496", "modifyLiquidity": "0x9371d11530af2cff27a016eed6923462a8179d9d7a7ad119d532185c103aa148" };
      function esimPlusDay(day, n) {
        return new Date(Date.parse(day + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
      }
      function esimClock() {
        return String(ESIM_CFG.dailyStartHour).padStart(2, "0") + ":00";
      }
      function esimIso(day) {
        return day + "T" + esimClock() + ":00+08:00";
      }
      function esimTargetDay(now) {
        return new Date(now.getTime() + (8 - ESIM_CFG.dailyStartHour) * 36e5 - 864e5).toISOString().slice(0, 10);
      }
      function esimAutoTargetDay(now) {
        return esimTargetDay(now);
      }
      function esimPlanDays(done, target, manual, start) {
        var seen = new Set(done), out = [];
        for (var d = start || ESIM_CFG.startDay; d <= target; d = esimPlusDay(d, 1)) if (!seen.has(d) || manual && d === target) out.push(d);
        return out;
      }
      function esimSerial(iso) {
        var n = Date.parse(iso.length === 10 ? iso + "T00:00:00+08:00" : iso) + 8 * 36e5;
        return Math.floor(n / 864e5) + 25569 + n % 864e5 / 864e5;
      }
      function esimDayFromSerial(n) {
        return new Date(Math.round((Number(n) - 25569) * 864e5)).toISOString().slice(0, 10);
      }
      function esimHex(n) {
        return "0x" + BigInt(n).toString(16);
      }
      function esimUnit(raw) {
        return Number(BigInt(raw)) / 1e18;
      }
      function esimWords(data) {
        if (!/^0x([0-9a-f]{64})*$/i.test(data)) throw new Error("\u94FE\u4E0A\u8FD4\u56DE\u683C\u5F0F\u4E0D\u5B8C\u6574");
        return (data.slice(2).match(/.{64}/g) || []).map((x) => BigInt("0x" + x));
      }
      function esimAddress(n) {
        return "0x" + BigInt(n).toString(16).padStart(40, "0").slice(-40);
      }
      function esimEncoded(n) {
        return ((BigInt(n) + (1n << 256n)) % (1n << 256n)).toString(16).padStart(64, "0");
      }
      function esimAssertPublishable(result) {
        var count = ESIM_CFG.addresses.length;
        if (!result || !Array.isArray(result.daily) || result.daily.length !== count) throw new Error(count + "\u4E2A\u5730\u5740\u8FD8\u672A\u5168\u90E8\u91C7\u96C6\uFF0C\u539F\u6570\u636E\u4E0D\u53D8");
        if ((result.reconciliation || []).length) throw new Error("\u94B1\u5305\u4F59\u989D\u6838\u5BF9\u6709\u5DEE\u989D\uFF0C\u539F\u6570\u636E\u4E0D\u53D8");
        var seen = /* @__PURE__ */ new Set();
        result.daily.forEach((r) => {
          if (!ESIM_CFG.addresses.includes(r.wallet) || seen.has(r.wallet) || !r.complete) throw new Error(count + "\u4E2A\u5730\u5740\u65E5\u62A5\u4E0D\u5B8C\u6574\uFF0C\u539F\u6570\u636E\u4E0D\u53D8");
          seen.add(r.wallet);
          if (r.needsReview || r.lpUnsplit) throw new Error("\u6709\u4EA4\u6613\u5206\u7C7B\u6216LP\u8D39\u7528\u9700\u8981\u590D\u6838\uFF0C\u539F\u6570\u636E\u4E0D\u53D8");
          for (var s of ["ESIM", "USDT", "BNB"]) if (!r.differencesRaw || r.differencesRaw[s] === void 0 || BigInt(r.differencesRaw[s]) !== 0n) throw new Error("\u94B1\u5305\u4F59\u989D\u6838\u5BF9\u6709\u5DEE\u989D\uFF0C\u539F\u6570\u636E\u4E0D\u53D8");
        });
      }
      function esimSafeMessage(e) {
        var s = String(e && e.message || e || "\u672A\u77E5\u9519\u8BEF").replace(/https?:\/\/\S+/g, "[\u63A5\u53E3\u5730\u5740\u5DF2\u9690\u85CF]");
        return s.replace(/(key|token|secret|authorization)[=:]\s*\S+/ig, "$1=[\u5DF2\u9690\u85CF]").slice(0, 250);
      }
      var ESIM_JOB = null, ESIM_DEADLINE = 0;
      function esimBudget() {
        if (ESIM_DEADLINE && Date.now() > ESIM_DEADLINE) {
          var e = new Error("ESIM_YIELD");
          e.code = "ESIM_YIELD";
          throw e;
        }
      }
      function esimTrimRpc(method, result) {
        if (method === "eth_getTransactionReceipt") {
          var topics = new Set(Object.values(ESIM_SIGNATURES).concat(["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f", "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65", "0x2251435bd151cd72851a82be055bf6d1c3d7f34d08d56493dddf874229b8e897"]));
          var x = { esimReceiptSchema: 3 };
          ["transactionHash", "transactionIndex", "blockHash", "blockNumber", "from", "to", "gasUsed", "effectiveGasPrice", "status"].forEach((k) => {
            if (result[k] !== void 0) x[k] = result[k];
          });
          if (!Array.isArray(result.logs)) throw new Error("\u4EA4\u6613\u56DE\u6267\u7F3A\u5C11\u65E5\u5FD7");
          x.logs = result.logs.filter((e) => e.topics && topics.has(e.topics[0])).map((e) => ({ address: e.address, topics: e.topics, data: e.data, logIndex: e.logIndex, removed: e.removed || false }));
          return x;
        }
        if (method === "eth_getTransactionByHash") {
          var t = {};
          ["hash", "from", "to", "nonce", "gasPrice", "blockNumber", "type", "value"].forEach((k) => {
            if (result[k] !== void 0) t[k] = result[k];
          });
          return t;
        }
        if (method === "eth_getBlockByNumber") {
          var b = { number: result.number, hash: result.hash, timestamp: result.timestamp };
          if (Array.isArray(result.transactions) && result.transactions.length && typeof result.transactions[0] === "object") b.transactions = result.transactions.map((t2) => ({ hash: t2.hash, from: t2.from, to: t2.to, nonce: t2.nonce, type: t2.type, authorizationList: t2.authorizationList }));
          return b;
        }
        if (method === "debug_traceTransaction") {
          let trim3 = function(f) {
            if (f.error) return { error: f.error };
            var children = (f.calls || []).map(trim3).filter(Boolean), lp = (f.input || "").startsWith(ESIM_SIGNATURES.modifyLiquidity.slice(0, 10));
            if (!lp && !children.length && (!f.value || BigInt(f.value) === 0n || !ESIM_CFG.addresses.includes(f.from) && !ESIM_CFG.addresses.includes(f.to))) return null;
            var r = { type: f.type, from: f.from, to: f.to, value: f.value || "0x0" };
            if (lp) {
              r.input = f.input;
              r.output = f.output;
            }
            if (children.length) r.calls = children;
            return r;
          };
          var trim2 = trim3;
          return trim3(result) || { type: result.type || "CALL", value: "0x0" };
        }
        return result;
      }
      function esimRpcResponseMap(data, batch) {
        if (!Array.isArray(data) || data.length !== batch.length) throw new Error("\u94FE\u4E0A\u6279\u91CF\u6570\u636E\u4E0D\u5B8C\u6574");
        var map = {}, ids = new Set(batch.map((x) => String(x.id)));
        data.forEach((x) => {
          if (!x || !ids.has(String(x.id)) || Object.prototype.hasOwnProperty.call(map, x.id)) throw new Error("\u94FE\u4E0A\u6279\u91CF\u6570\u636E\u6807\u8BC6\u7F3A\u5931\u6216\u91CD\u590D");
          map[x.id] = x;
        });
        return map;
      }
      function esimRpcResponseError(request, item) {
        var e = new Error("\u94FE\u4E0A\u8BFB\u53D6\u5931\u8D25\uFF1A" + request.method + "\uFF08" + (item && item.error ? item.error.code : "\u7F3A\u5931") + "\uFF09");
        e.code = item && item.error && item.error.code;
        var msg = String(item && item.error && item.error.message || "");
        if (msg) e.message += "\uFF1A" + esimSafeMessage(msg);
        e.contractRevert = request.method === "eth_call" && /execution reverted|VM Exception[^\n]*\brevert\b|revert opcode/i.test(msg);
        e.expiredPage = request.method === "alchemy_getAssetTransfers" && !!request.params[0].pageKey && /page|cursor/i.test(msg) && /expir|invalid|not found/i.test(msg);
        return e;
      }
      function esimRpcTemporary(item) {
        var e = item && item.error;
        return !!e && ([-32005, 429].includes(Number(e.code)) || [-32e3, -32603].includes(Number(e.code)) && /^internal error[.!]?$/i.test(String(e.message || "").trim()));
      }
      function esimRpcMany(calls) {
        esimBudget();
        var allowed2 = /* @__PURE__ */ new Set(["eth_chainId", "eth_getBlockByNumber", "eth_getBalance", "eth_getTransactionCount", "eth_call", "eth_getTransactionByHash", "eth_getTransactionReceipt", "alchemy_getAssetTransfers", "web3_sha3", "debug_traceTransaction", "trace_filter"]);
        var cache2 = ESIM_JOB ? ESIM_JOB.rpc : {};
        var out = [], missing = [];
        calls.forEach((c, i) => {
          if (!allowed2.has(c[0])) throw new Error("\u53EA\u5141\u8BB8\u8BFB\u53D6\u94FE\u4E0A\u6570\u636E");
          var key2 = JSON.stringify(c);
          if (Object.prototype.hasOwnProperty.call(cache2, key2)) out[i] = cache2[key2];
          else missing.push({ id: i, method: c[0], params: c[1], key: key2 });
        });
        for (var start = 0; start < missing.length; start += 20) {
          esimBudget();
          var batch = missing.slice(start, start + 20), endpoint = PropertiesService.getScriptProperties().getProperty("ESIM_RPC_URL");
          if (!endpoint || !/^https:\/\/[^\s]+$/.test(endpoint)) throw new Error("\u672A\u914D\u7F6E\u53EA\u8BFB\u94FE\u4E0A\u63A5\u53E3\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
          var data = null;
          for (var attempt = 0; attempt < 3; attempt++) {
            esimBudget();
            var response;
            try {
              if (ESIM_JOB) ESIM_JOB.rpcCalls = (ESIM_JOB.rpcCalls || 0) + batch.length;
              response = UrlFetchApp.fetch(endpoint, { method: "post", contentType: "application/json", payload: JSON.stringify(batch.map((x) => ({ jsonrpc: "2.0", id: x.id, method: x.method, params: x.params }))), muteHttpExceptions: true, followRedirects: false });
            } catch (e) {
              var cause = String(e && e.message || e || "\u672A\u63D0\u4F9B\u5177\u4F53\u539F\u56E0").split(endpoint).join("[\u63A5\u53E3\u5730\u5740\u5DF2\u9690\u85CF]").replace(/\bBearer\s+[A-Za-z0-9._~+\/=\-]+/gi, "Bearer [\u51ED\u636E\u5DF2\u9690\u85CF]").replace(/(["']?(?:api[_-]?key|access[_-]?token|key|token|secret|authorization)["']?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi, "$1[\u51ED\u636E\u5DF2\u9690\u85CF]");
              cause = esimSafeMessage(cause);
              var permanent = /for one day|一天调用次数过多的服务|daily (?:quota|limit)|quota.{0,30}(?:daily|per day)|(?:每日|每天|一天).{0,20}(?:配额|限额)|not have permission|permission denied|not authorized|invalid argument|malformed|unsupported protocol/i.test(cause);
              if (permanent || attempt === 2) throw new Error((permanent ? "Google\u94FE\u4E0A\u8BFB\u53D6\u670D\u52A1\u62D2\u7EDD\u8BF7\u6C42\uFF1A" : "\u94FE\u4E0A\u63A5\u53E3\u8FDE\u63A5\u5931\u8D25\uFF1A") + cause + "\uFF1B\u539F\u6570\u636E\u4FDD\u7559\u3002");
              Utilities.sleep(800 * (attempt + 1));
              continue;
            }
            var status = response.getResponseCode();
            if (status === 429 || status >= 500) {
              if (attempt === 2) throw new Error("\u94FE\u4E0A\u63A5\u53E3\u7E41\u5FD9\uFF08" + status + "\uFF09\uFF0C\u7A0D\u540E\u91CD\u8BD5");
              Utilities.sleep(1e3 * (attempt + 1));
              continue;
            }
            if (status !== 200) throw new Error("\u94FE\u4E0A\u63A5\u53E3\u8BBF\u95EE\u5931\u8D25\uFF08" + status + "\uFF09\uFF0C\u8BF7\u68C0\u67E5\u53EA\u8BFB\u63A5\u53E3\u914D\u7F6E");
            try {
              data = JSON.parse(response.getContentText());
            } catch (e) {
              throw new Error("\u94FE\u4E0A\u63A5\u53E3\u8FD4\u56DE\u4E0D\u662F\u6709\u6548\u6570\u636E");
            }
            var limited = (Array.isArray(data) ? data : [data]).find(esimRpcTemporary);
            if (limited) {
              if (Array.isArray(data)) {
                var partial = esimRpcResponseMap(data, batch), retry = [];
                batch.forEach((x) => {
                  var v = partial[x.id];
                  if (esimRpcTemporary(v)) {
                    retry.push(x);
                    return;
                  }
                  if (v.error || v.result === null || v.result === void 0) throw esimRpcResponseError(x, v);
                  var value = esimTrimRpc(x.method, v.result);
                  out[x.id] = value;
                  if (!x.params.includes("latest") && !x.params.includes("pending")) cache2[x.key] = value;
                });
                batch = retry;
              }
              if (attempt === 2) {
                var rateError = new Error("\u94FE\u4E0A\u63A5\u53E3\u7E41\u5FD9\uFF08" + limited.error.code + "\uFF09\uFF0C\u7A0D\u540E\u91CD\u8BD5");
                rateError.code = Number(limited.error.code);
                throw rateError;
              }
              Utilities.sleep(1e3 * (attempt + 1));
              continue;
            }
            break;
          }
          var map = esimRpcResponseMap(data, batch);
          batch.forEach((x) => {
            var v = map[x.id];
            if (!v || v.error || v.result === null || v.result === void 0) throw esimRpcResponseError(x, v);
            var value = esimTrimRpc(x.method, v.result);
            out[x.id] = value;
            if (!x.params.includes("latest") && !x.params.includes("pending")) cache2[x.key] = value;
          });
        }
        return out;
      }
      function esimRpc(method, params) {
        return esimRpcMany([[method, params]])[0];
      }
      function esimBeforeTime(timestamp, high) {
        var lo = ESIM_CFG.startBoundary.block, hi = high;
        if (Number(BigInt(esimRpc("eth_getBlockByNumber", [esimHex(hi), false]).timestamp)) < timestamp) {
          var pending = new Error("\u7EDF\u8BA1\u7ED3\u675F\u533A\u5757\u5C1A\u672A\u786E\u8BA4\uFF0C\u4E0B\u6B21\u81EA\u52A8\u7EE7\u7EED");
          pending.code = "ESIM_YIELD";
          throw pending;
        }
        while (lo < hi) {
          esimBudget();
          var mid = Math.floor((lo + hi + 1) / 2), b = esimRpc("eth_getBlockByNumber", [esimHex(mid), false]);
          if (Number(BigInt(b.timestamp)) < timestamp) lo = mid;
          else hi = mid - 1;
        }
        return lo;
      }
      function esimAnalyzeDay(bundle) {
        esimLedgerRequire_(bundle && bundle.state && bundle.state.config, "Missing state/config");
        var state = bundle.state, cfg = state.config;
        ["transfers", "balances", "lpInventory", "nativeTransfers"].forEach(function(key2) {
          esimLedgerRequire_(Array.isArray(bundle[key2]), "Missing array: " + key2);
        });
        ["receipts", "transactions", "pools", "signatures", "blockTimes"].forEach(function(key2) {
          esimLedgerRequire_(bundle[key2] && typeof bundle[key2] === "object" && !Array.isArray(bundle[key2]), "Missing map: " + key2);
        });
        esimLedgerRequire_(bundle.lpCashflows && bundle.lpCashflows.byTransaction, "Missing lpCashflows.byTransaction");
        esimLedgerRequire_(Array.isArray(cfg.addresses) && cfg.addresses.length > 0, "Missing addresses");
        var wallets = cfg.addresses.map(esimLedgerAddress_), addresses = new Set(wallets);
        esimLedgerRequire_(addresses.size === wallets.length, "Duplicate cohort address");
        var tokens = {};
        tokens[esimLedgerAddress_(cfg.token)] = "ESIM";
        tokens[esimLedgerAddress_(cfg.usdt)] = "USDT";
        esimLedgerRequire_(Object.keys(tokens).length === 2, "Token addresses must differ");
        esimLedgerRequire_(cfg.chainId === 56, "Expected BNB chain 56");
        var resolutions = {}, resolutionEntries = cfg.verifiedNonEsimResolutions === void 0 ? [] : cfg.verifiedNonEsimResolutions;
        esimLedgerRequire_(Array.isArray(resolutionEntries), "Invalid non-ESIM resolution list");
        resolutionEntries.forEach(function(item) {
          esimLedgerRequire_(item && typeof item.hash === "string" && /^0x[0-9a-f]{64}$/i.test(item.hash) && typeof item.wallet === "string" && /^0x[0-9a-f]{40}$/i.test(item.wallet), "Invalid non-ESIM resolution identity");
          var key2 = item.hash.toLowerCase() + "|" + item.wallet.toLowerCase();
          esimLedgerRequire_(!resolutions[key2], "Duplicate non-ESIM resolution");
          resolutions[key2] = item;
        });
        esimLedgerRequire_(Array.isArray(state.boundaries) && state.boundaries.length === 2, "Exactly two day boundaries required");
        var start = state.boundaries[0], end = state.boundaries[1], startMs = Date.parse(start.time), endMs = Date.parse(end.time);
        esimLedgerRequire_(Number.isFinite(startMs) && Number.isFinite(endMs) && startMs < endMs, "Invalid time boundaries");
        var firstBlock = esimLedgerNumber_(state.startBlock, "startBlock"), lastBlock = esimLedgerNumber_(state.endBlock, "endBlock");
        esimLedgerRequire_(firstBlock === esimLedgerNumber_(start.block, "opening block") + 1 && lastBlock === esimLedgerNumber_(end.block, "closing block") && firstBlock <= lastBlock, "Invalid block boundaries");
        var day = esimLedgerBjt_(startMs).slice(0, 10), inverse = {};
        ["v2swap", "v3swap", "pcsv3swap", "infswap", "uniswap", "inflp", "v3mint", "v3burn", "v3collect", "v2mint", "v2burn"].forEach(function(name) {
          var topic = bundle.signatures[name];
          esimLedgerRequire_(typeof topic === "string" && /^0x[0-9a-f]{64}$/i.test(topic), "Missing event signature: " + name);
          esimLedgerRequire_(!inverse[topic.toLowerCase()], "Duplicate event signature");
          inverse[topic.toLowerCase()] = name;
        });
        var transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        var pcs = "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b";
        var timestamps = {}, transferIds = /* @__PURE__ */ new Set(), nativeByTx = {}, nativeIds = /* @__PURE__ */ new Set();
        Object.keys(bundle.transactions).forEach(function(hash2) {
          esimLedgerRequire_(bundle.receipts[hash2], "Missing transaction receipt: " + hash2);
        });
        bundle.transfers.forEach(function(t) {
          esimLedgerRequire_(t && t.hash && t.uniqueId && t.metadata && t.metadata.blockTimestamp, "Incomplete transfer");
          esimLedgerRequire_(!transferIds.has(t.uniqueId), "Duplicate transfer: " + t.uniqueId);
          transferIds.add(t.uniqueId);
          esimLedgerRange_(t.blockNum, firstBlock, lastBlock, "transfer");
          var ms = Date.parse(t.metadata.blockTimestamp);
          esimLedgerRequire_(ms >= startMs && ms < endMs, "Transfer outside time interval");
          if (timestamps[t.hash] !== void 0) esimLedgerRequire_(timestamps[t.hash] === ms, "Conflicting transaction timestamps");
          timestamps[t.hash] = ms;
          var required = t.category !== "erc20" || t.rawContract && tokens[String(t.rawContract.address).toLowerCase()] || addresses.has(String(t.from).toLowerCase());
          if (required) esimLedgerRequire_(bundle.receipts[t.hash], "Missing transfer receipt: " + t.hash);
          if (bundle.receipts[t.hash]) esimLedgerRequire_(esimLedgerNumber_(t.blockNum, "transfer block") === esimLedgerNumber_(bundle.receipts[t.hash].blockNumber, "receipt block"), "Transfer/receipt block mismatch");
        });
        bundle.nativeTransfers.forEach(function(t) {
          esimLedgerRequire_(t && t.hash && Array.isArray(t.tracePath), "Incomplete native transfer");
          var id = t.hash + ":" + t.tracePath.join(".");
          esimLedgerRequire_(!nativeIds.has(id), "Duplicate native trace: " + id);
          nativeIds.add(id);
          esimLedgerRequire_(bundle.receipts[t.hash], "Missing native receipt: " + t.hash);
          esimLedgerRequire_(esimLedgerRaw_(t.amountRaw, "native amount") > 0n, "Native amount must be positive");
          esimLedgerAddress_(t.from);
          esimLedgerAddress_(t.to);
          (nativeByTx[t.hash] || (nativeByTx[t.hash] = [])).push(t);
        });
        var totals = {}, rows = [], flows = [], lpEvents = [], otherTokens = [], buyKeys = /* @__PURE__ */ new Set(), sellKeys = /* @__PURE__ */ new Set(), otherNativeKeys = /* @__PURE__ */ new Set(), classificationNotes = {};
        wallets.forEach(function(wallet) {
          totals[wallet] = {};
        });
        Object.keys(bundle.receipts).forEach(function(hash2) {
          var r = bundle.receipts[hash2], tx = bundle.transactions[hash2];
          esimLedgerRequire_(r && tx && Array.isArray(r.logs), "Missing receipt/transaction/logs: " + hash2);
          if (r.transactionHash) esimLedgerRequire_(r.transactionHash === hash2, "Receipt hash mismatch");
          if (tx.hash) esimLedgerRequire_(tx.hash === hash2, "Transaction hash mismatch");
          var block = esimLedgerRange_(r.blockNumber, firstBlock, lastBlock, "receipt");
          if (tx.blockNumber !== void 0) esimLedgerRequire_(esimLedgerNumber_(tx.blockNumber, "tx block") === block, "Transaction block mismatch");
          var ms = timestamps[hash2];
          if (ms === void 0) ms = Date.parse(bundle.blockTimes[String(block)]);
          esimLedgerRequire_(Number.isFinite(ms) && ms >= startMs && ms < endMs, "Missing/out-of-range receipt timestamp: " + hash2);
          if (bundle.blockTimes[String(block)] !== void 0) esimLedgerRequire_(ms === Date.parse(bundle.blockTimes[String(block)]), "Transfer/block timestamp mismatch");
          var txValue = esimLedgerRaw_(tx.value, "transaction value");
          esimLedgerRequire_(txValue >= 0n, "Negative transaction value");
          var time = esimLedgerBjt_(ms), who = esimLedgerAddress_(tx.from), status = esimLedgerRaw_(r.status, "receipt status");
          esimLedgerRequire_(status === 0n || status === 1n, "Invalid receipt status");
          var data = {}, relevant = [], unresolvedPool = false, logIds = /* @__PURE__ */ new Set(), swapRoutes = [], esimSwapOutput = 0n, esimSwapOutputKnown = false;
          function walletData(a) {
            return data[a] || (data[a] = {});
          }
          r.logs.forEach(function(e) {
            esimLedgerRequire_(e && Array.isArray(e.topics), "Incomplete receipt log");
            var li = esimLedgerNumber_(e.logIndex, "logIndex");
            esimLedgerRequire_(!logIds.has(li), "Duplicate receipt log: " + hash2 + ":" + li);
            logIds.add(li);
            esimLedgerRequire_(!e.removed, "Removed log cannot enter ledger");
            if (e.transactionHash) esimLedgerRequire_(e.transactionHash === hash2, "Log hash mismatch");
            if (e.blockNumber !== void 0) esimLedgerRequire_(esimLedgerNumber_(e.blockNumber, "log block") === block, "Log block mismatch");
            if (status === 0n) {
              esimLedgerRequire_(r.logs.length === 0, "Failed receipt contains logs");
              return;
            }
            if (!e.topics.length) return;
            var contract = esimLedgerAddress_(e.address), topic = e.topics[0].toLowerCase(), sym = tokens[contract];
            if (topic === transferTopic && sym) {
              esimLedgerRequire_(e.topics.length >= 3, "Malformed token Transfer");
              var amount = esimLedgerRaw_(e.data, "Transfer amount"), from = esimLedgerTopicAddress_(e.topics[1]), to = esimLedgerTopicAddress_(e.topics[2]);
              esimLedgerRequire_(amount >= 0n, "Negative token transfer");
              if (amount && (addresses.has(from) || addresses.has(to))) {
                var internal = addresses.has(from) && addresses.has(to);
                flows.push({ day, time, from, to, asset: sym, amount: esimLedgerUnit_(amount), amountRaw: String(amount), internal, hash: hash2, block, logIndex: li });
                [[from, -1n], [to, 1n]].forEach(function(part) {
                  if (!addresses.has(part[0])) return;
                  var v = walletData(part[0]);
                  esimLedgerAdd_(v, sym, part[1] * amount);
                  esimLedgerAdd_(v, (internal ? "internal" : "external") + sym, part[1] * amount);
                  if (internal) esimLedgerAdd_(v, "internal" + (part[1] > 0n ? "In" : "Out") + sym, amount);
                });
              }
            }
            var kind = inverse[topic];
            if (!kind) return;
            var pid = kind.indexOf("inf") === 0 && contract === pcs || kind === "uniswap" ? e.topics[1] : contract;
            var pool = bundle.pools[pid];
            if (!pool) {
              unresolvedPool = true;
              return;
            }
            if (pool.manager && esimLedgerAddress_(pool.manager) !== contract) {
              unresolvedPool = true;
              return;
            }
            if (kind.indexOf("swap") !== -1) {
              var delta = esimLedgerSwapDelta_(kind, e.data), t0 = esimLedgerAddress_(pool.token0), t1 = esimLedgerAddress_(pool.token1);
              if (delta) {
                if (t0 === cfg.token.toLowerCase() || t1 === cfg.token.toLowerCase()) {
                  var output = delta[t0 === cfg.token.toLowerCase() ? 0 : 1];
                  esimSwapOutput += output > 0n ? output : 0n;
                  esimSwapOutputKnown = true;
                } else if (delta[0] * delta[1] < 0n) {
                  swapRoutes.push({ from: delta[0] < 0n ? t0 : t1, to: delta[0] > 0n ? t0 : t1, pool: pid });
                }
              }
            }
            if (esimLedgerAddress_(pool.token0) !== cfg.token.toLowerCase() && esimLedgerAddress_(pool.token1) !== cfg.token.toLowerCase()) return;
            relevant.push(kind);
            if (kind.indexOf("swap") === -1) {
              var words = kind === "inflp" ? esimLedgerWords_(e.data) : [];
              if (kind === "inflp") esimLedgerRequire_(words.length >= 4, "Malformed Infinity liquidity event");
              lpEvents.push({ day, time, initiator: who, hash: hash2, pool: pid, event: kind, logIndex: li, liquidityDelta: kind === "inflp" ? String(BigInt.asIntN(256, words[2])) : "", tokenId: kind === "inflp" ? String(words[3]) : "" });
            }
          });
          var swaps = relevant.some(function(k) {
            return k.indexOf("swap") !== -1;
          });
          var lp = relevant.some(function(k) {
            return k.indexOf("swap") === -1;
          });
          if (addresses.has(who)) {
            var payer = walletData(who), gasPrice = r.effectiveGasPrice === void 0 || r.effectiveGasPrice === null ? tx.gasPrice : r.effectiveGasPrice;
            payer.gas = esimLedgerRaw_(r.gasUsed, "gasUsed") * esimLedgerRaw_(gasPrice, "gasPrice");
            esimLedgerRequire_(payer.gas >= 0n, "Negative gas");
            payer.sentTransaction = 1n;
            payer.failed = status === 0n ? 1n : 0n;
          }
          var native = nativeByTx[hash2] || [];
          esimLedgerRequire_(status === 1n || native.length === 0, "Failed transaction contains native movement");
          native.forEach(function(t) {
            var amount = esimLedgerRaw_(t.amountRaw, "native amount"), from = t.from.toLowerCase(), to = t.to.toLowerCase();
            if (addresses.has(from)) esimLedgerAdd_(walletData(from), "BNB", -amount);
            if (addresses.has(to)) esimLedgerAdd_(walletData(to), "BNB", amount);
          });
          if (status === 1n && txValue > 0n && (addresses.has(who) || addresses.has(String(tx.to).toLowerCase()))) {
            esimLedgerRequire_(native.some(function(t) {
              return t.tracePath.length === 0 && t.from.toLowerCase() === who && (!tx.to || t.to.toLowerCase() === String(tx.to).toLowerCase()) && esimLedgerRaw_(t.amountRaw, "native root") === txValue;
            }), "Missing root native trace: " + hash2);
          }
          Object.keys(data).forEach(function(wallet) {
            var v = data[wallet], esim = esimLedgerGet_(v, "externalESIM"), usdt = esimLedgerGet_(v, "externalUSDT"), bnb = esimLedgerGet_(v, "BNB");
            var kind = "\u6388\u6743/\u5408\u7EA6\u8C03\u7528";
            if (esimLedgerGet_(v, "failed")) kind = "\u5931\u8D25\u4EA4\u6613";
            else if (lp && swaps) kind = "\u7EC4\u5408\u4EA4\u6613\u5F85\u62C6\u5206";
            else if (lp) kind = esim < 0n || usdt < 0n ? "LP\u6295\u5165/\u8C03\u6574" : esim > 0n || usdt > 0n ? "LP\u6536\u56DE/\u9886\u53D6\u8D39\u7528" : "LP\u8C03\u6574";
            else if (swaps && esim > 0n && usdt < 0n) kind = "\u4E70\u5165";
            else if (swaps && esim < 0n && usdt > 0n) kind = "\u5356\u51FA";
            else if (swaps && esim < 0n && usdt === 0n && bnb > 0n && !native.some(function(t) {
              return addresses.has(t.from.toLowerCase()) && addresses.has(t.to.toLowerCase()) && (t.from.toLowerCase() === wallet || t.to.toLowerCase() === wallet);
            }) && esimLedgerNativeSale_(r, native, wallet, cfg.token, -esim, bnb)) {
              kind = "\u5356\u51FA";
              sellKeys.add(hash2 + "|" + wallet);
            } else if (swaps && esim > 0n && usdt === 0n && bnb < 0n) kind = "BNB\u4E70\u5165";
            else if (swaps && (esim || usdt)) kind = "\u5176\u4ED6\u5E01\u79CD/\u7EC4\u5408\u5151\u6362";
            else if (esim || usdt) kind = "\u5916\u90E8\u8F6C\u8D26";
            else if (["internalInESIM", "internalOutESIM", "internalInUSDT", "internalOutUSDT"].some(function(k) {
              return esimLedgerGet_(v, k) !== 0n;
            })) kind = "\u5185\u90E8\u8C03\u62E8";
            else if (bnb) kind = "BNB\u8FDB\u51FA";
            var mixedSwapWarning = swaps && esim > 0n && (!esimSwapOutputKnown || esim > esimSwapOutput);
            if (mixedSwapWarning) kind = "\u7EC4\u5408\u4EA4\u6613\u5F85\u62C6\u5206";
            var nonEsimCounterflow = !esim && !lp && usdt * bnb < 0n;
            var route = nonEsimCounterflow ? esimLedgerSwapRoute_(swapRoutes, bnb < 0n ? "0x0000000000000000000000000000000000000000" : cfg.usdt, bnb > 0n ? "0x0000000000000000000000000000000000000000" : cfg.usdt) : null;
            var resolution = resolutions[hash2.toLowerCase() + "|" + wallet];
            if (resolution) {
              var resolutionUsdt = esimLedgerGet_(v, "USDT");
              esimLedgerRequire_(esimLedgerGet_(v, "ESIM") === 0n && !lp && resolutionUsdt * bnb < 0n && status === 1n, "Non-ESIM resolution does not match a successful counterflow");
              esimLedgerRequire_(resolution.chainId === 56, "Non-ESIM resolution chain mismatch");
              esimLedgerRequire_(typeof r.blockHash === "string" && /^0x[0-9a-f]{64}$/i.test(r.blockHash) && typeof resolution.blockHash === "string" && resolution.blockHash.toLowerCase() === r.blockHash.toLowerCase(), "Non-ESIM resolution block hash mismatch");
              esimLedgerRequire_(esimLedgerNumber_(resolution.blockNumber, "resolution block") === block, "Non-ESIM resolution block mismatch");
              ["USDT", "BNB"].forEach(function(asset) {
                var expected = resolution["expected" + asset + "raw"];
                esimLedgerRequire_(typeof expected === "string" && /^-?\d+$/.test(expected), "Invalid non-ESIM resolution raw " + asset);
                esimLedgerRequire_(BigInt(expected) === (asset === "USDT" ? resolutionUsdt : bnb), "Non-ESIM resolution amount mismatch " + asset);
              });
              esimLedgerRequire_(["\u975EESIM\u5151\u6362", "\u975EESIM\u5151\u6362\u53CA\u8D39\u7528"].includes(resolution.type), "Invalid non-ESIM resolution type");
              esimLedgerRequire_(typeof resolution.reason === "string" && resolution.reason.trim().length > 0 && Array.isArray(resolution.evidence) && resolution.evidence.length > 0, "Missing non-ESIM resolution evidence");
              if (route || !nonEsimCounterflow) resolution = null;
            }
            var classificationNote = "";
            if (sellKeys.has(hash2 + "|" + wallet)) {
              classificationNote = "\u5DF2\u6838\u5BF9\u6210\u529F ESIM Swap\u3001\u8DEF\u7531\u7ED3\u7B97\u4E8B\u4EF6\u3001WBNB \u64A4\u56DE\u53CA\u8FD4\u56DE\u94B1\u5305\u7684\u539F\u751F\u5E01\u8C03\u7528\uFF1BBNB \u56DE\u6B3E\u5355\u5217\uFF0C\u4E0D\u6298\u7B97 USDT \u6216\u8BA1\u5916\u90E8\u5165\u91D1\u3002";
              (classificationNotes[wallet] || (classificationNotes[wallet] = [])).push({ hash: hash2, type: "BNB\u7ED3\u7B97\u5356\u51FA", reason: classificationNote, USDT: String(usdt), BNB: String(bnb), amountUnit: "raw-18-decimals" });
            }
            if (nonEsimCounterflow) {
              kind = resolution ? resolution.type : route ? "\u975EESIM\u5151\u6362" : "\u5176\u4ED6\u5F85\u6838\u5B9E\u6536\u652F";
              otherNativeKeys.add(hash2 + "|" + wallet);
              classificationNote = resolution ? resolution.reason : route ? "\u5DF2\u8BC6\u522B\u6210\u529FSwap\u4E8B\u4EF6\u53CA\u5DF2\u9A8C\u8BC1\u6C60\u8D44\u4EA7\u8FDE\u901A\u8DEF\u5F84\uFF1B\u975EESIM\u5151\u6362\u8BA1\u5176\u4ED6\u6536\u652F\uFF0C\u4E0D\u4F5C\u5916\u90E8\u5165\u91D1\u3002" : "USDT\u4E0EBNB\u65B9\u5411\u76F8\u53CD\uFF0C\u4F46\u73B0\u6709\u5DF2\u9A8C\u8BC1\u6C60\u4E8B\u4EF6\u4E0D\u80FD\u5EFA\u7ACB\u5B8C\u6574\u5BF9\u5E94\u8DEF\u5F84\uFF1B\u4EC5\u786E\u8BA4\u91D1\u989D\uFF0C\u5151\u6362\u7C7B\u522B\u5F85\u6838\u5B9E\uFF0C\u4E0D\u4F5C\u5916\u90E8\u5165\u91D1\u3002";
              (classificationNotes[wallet] || (classificationNotes[wallet] = [])).push({ hash: hash2, type: kind, reason: classificationNote, USDT: String(usdt), BNB: String(bnb), amountUnit: "raw-18-decimals" });
            }
            var cash = {}, supplied = wallet === who ? bundle.lpCashflows.byTransaction[hash2] : null;
            var cashvalid = !!supplied;
            ["ESIM", "USDT"].forEach(function(sym) {
              ["lpIn", "lpOut", "lpFee"].forEach(function(prefix) {
                var key2 = prefix + sym;
                if (!supplied || supplied[key2] === void 0 || supplied[key2] === null) cashvalid = false;
                else {
                  cash[key2] = esimLedgerRaw_(supplied[key2], key2);
                  esimLedgerRequire_(cash[key2] >= 0n, "Negative LP cash flow");
                }
              });
              if (cashvalid && esimLedgerGet_(cash, "lpOut" + sym) + esimLedgerGet_(cash, "lpFee" + sym) - esimLedgerGet_(cash, "lpIn" + sym) !== (sym === "ESIM" ? esim : usdt)) cashvalid = false;
            });
            var unrecognizedExchange = !swaps && !lp && (esim * usdt < 0n || esim * bnb < 0n);
            var needsReview = kind === "\u7EC4\u5408\u4EA4\u6613\u5F85\u62C6\u5206" || kind === "\u5176\u4ED6\u5E01\u79CD/\u7EC4\u5408\u5151\u6362" || lp && !cashvalid || unresolvedPool && !!(esim || lp) || unrecognizedExchange;
            var row = { day, time, wallet, type: kind, esim: esimLedgerUnit_(esimLedgerGet_(v, "ESIM")), usdt: esimLedgerUnit_(esimLedgerGet_(v, "USDT")), externalEsim: esimLedgerUnit_(esim), externalUsdt: esimLedgerUnit_(usdt), bnb: esimLedgerUnit_(bnb), gas: esimLedgerUnit_(esimLedgerGet_(v, "gas")), hash: hash2, block, status: r.status, initiator: who, to: tx.to, internalInEsim: esimLedgerUnit_(esimLedgerGet_(v, "internalInESIM")), internalOutEsim: esimLedgerUnit_(esimLedgerGet_(v, "internalOutESIM")), internalInUsdt: esimLedgerUnit_(esimLedgerGet_(v, "internalInUSDT")), internalOutUsdt: esimLedgerUnit_(esimLedgerGet_(v, "internalOutUSDT")), lpBreakdown: cashvalid ? "\u5DF2\u62C6\u5206\u672C\u91D1\u4E0E\u8D39\u7528" : lp ? "LP\u8D39\u7528\u672A\u5355\u62C6" : "", needsReview };
            row.nonEsimSwapWarning = !esim && (unresolvedPool || usdt * bnb < 0n);
            row.nonEsimClassification = nonEsimCounterflow ? resolution ? "verified-transaction-trace" : route ? "verified-swap-route" : "unverified-counterflow" : "";
            row.nonEsimSwapWarning = nonEsimCounterflow ? !(route || resolution) : row.nonEsimSwapWarning;
            row.classificationNote = classificationNote;
            row.nonEsimSwapEvidence = resolution ? resolution.evidence : route || [];
            row.mixedSwapWarning = mixedSwapWarning;
            row.unrecognizedExchange = unrecognizedExchange;
            ["ESIM", "USDT"].forEach(function(sym) {
              ["lpIn", "lpOut", "lpFee"].forEach(function(prefix) {
                row[prefix + sym] = cashvalid ? esimLedgerUnit_(cash[prefix + sym]) : 0;
              });
            });
            rows.push(row);
            var c = totals[wallet];
            Object.keys(v).forEach(function(key2) {
              esimLedgerAdd_(c, key2, v[key2]);
            });
            ["ESIM", "USDT"].forEach(function(sym) {
              var raw = sym === "ESIM" ? esim : usdt;
              if (kind === "\u4E70\u5165" || kind === "\u5356\u51FA") esimLedgerAdd_(c, kind + sym, raw);
              else if (kind.indexOf("LP") === 0 && cashvalid) ["lpIn", "lpOut", "lpFee"].forEach(function(prefix) {
                esimLedgerAdd_(c, prefix + sym, cash[prefix + sym]);
              });
              else if (kind === "\u5916\u90E8\u8F6C\u8D26") {
                esimLedgerAdd_(c, "deposit" + sym, raw > 0n ? raw : 0n);
                esimLedgerAdd_(c, "withdraw" + sym, raw < 0n ? -raw : 0n);
              } else if (kind === "BNB\u4E70\u5165") esimLedgerAdd_(c, "bnbBuy" + sym, raw);
              else esimLedgerAdd_(c, "other" + sym, raw);
            });
            if (kind === "BNB\u4E70\u5165") {
              esimLedgerAdd_(c, "bnbBuyCost", -bnb);
              buyKeys.add(hash2 + "|" + wallet);
            }
            if (lp && !cashvalid) esimLedgerAdd_(c, "lpUnsplit", 1n);
            esimLedgerAdd_(c, "transactions", 1n);
            if (needsReview) esimLedgerAdd_(c, "needsReview", 1n);
          });
        });
        bundle.transfers.forEach(function(t) {
          if (t.category === "erc20" && t.rawContract && !tokens[String(t.rawContract.address).toLowerCase()]) otherTokens.push({ time: t.metadata.blockTimestamp, asset: t.asset || "", contract: t.rawContract.address, from: t.from, to: t.to, amount: t.value, hash: t.hash, note: "\u5176\u4ED6\u5408\u7EA6\uFF1B\u4E0D\u5408\u5E76\u8FDB ESIM/USDT\u3002\u540D\u79F0\u76F8\u4F3C\u4E0D\u4EE3\u8868\u540C\u5E01\u3002" });
        });
        var balanceIndex = {}, lpIndex = {}, lpIds = /* @__PURE__ */ new Set();
        bundle.balances.forEach(function(b) {
          var wallet = esimLedgerAddress_(b.address), key2 = b.time + "|" + wallet;
          esimLedgerRequire_(addresses.has(wallet) && (b.time === start.time || b.time === end.time), "Balance outside cohort/boundaries");
          esimLedgerRequire_(!balanceIndex[key2], "Duplicate boundary balance");
          balanceIndex[key2] = b;
          esimLedgerRequire_(esimLedgerNumber_(b.block, "balance block") === (b.time === start.time ? start.block : end.block), "Balance block mismatch");
          ["ESIM", "USDT", "BNB", "nonce"].forEach(function(s) {
            esimLedgerRequire_(esimLedgerRaw_(b[s], "balance " + s) >= 0n, "Negative balance " + s);
          });
        });
        bundle.lpInventory.forEach(function(p) {
          var owner = esimLedgerAddress_(p.owner), key2 = p.time + "|" + owner;
          esimLedgerRequire_(addresses.has(owner) && (p.time === start.time || p.time === end.time), "LP inventory outside boundaries/cohort");
          esimLedgerRequire_(esimLedgerNumber_(p.block, "LP block") === (p.time === start.time ? start.block : end.block), "LP inventory block mismatch");
          var id = key2 + "|" + p.manager + "|" + p.tokenId;
          esimLedgerRequire_(!lpIds.has(id), "Duplicate LP position");
          lpIds.add(id);
          if (!lpIndex[key2]) lpIndex[key2] = {};
          ["ESIM", "USDT"].forEach(function(sym) {
            lpIndex[key2][sym] = esimLedgerDecimalAdd_(lpIndex[key2][sym], esimLedgerDecimal_(p[sym], "LP " + sym));
          });
        });
        var daily = [], reconciliation = [], nativeCategories = [], nativeTotals = {};
        wallets.forEach(function(wallet) {
          nativeTotals[wallet] = {};
        });
        bundle.nativeTransfers.forEach(function(t) {
          var from = t.from.toLowerCase(), to = t.to.toLowerCase(), internal = addresses.has(from) && addresses.has(to), amount = esimLedgerRaw_(t.amountRaw, "native amount");
          [[from, -1n], [to, 1n]].forEach(function(part) {
            if (!addresses.has(part[0])) return;
            var category = buyKeys.has(t.hash + "|" + part[0]) ? "buy" : sellKeys.has(t.hash + "|" + part[0]) ? "sell" : internal ? "internal" : otherNativeKeys.has(t.hash + "|" + part[0]) ? "other" : part[1] > 0n ? "deposit" : "withdraw";
            esimLedgerAdd_(nativeTotals[part[0]], category, amount * (category === "buy" || category === "sell" || category === "internal" || category === "other" ? part[1] : 1n));
          });
        });
        wallets.forEach(function(wallet) {
          var before = balanceIndex[start.time + "|" + wallet], after = balanceIndex[end.time + "|" + wallet], c = totals[wallet];
          esimLedgerRequire_(before && after, "Missing boundary balance: " + wallet);
          var rec = { day, start: start.time, end: end.time, wallet, complete: !end.partial, txCount: Number(esimLedgerGet_(c, "transactions")), needsReview: Number(esimLedgerGet_(c, "needsReview")), startBlock: start.block, endBlock: end.block, differencesRaw: {}, raw: {} };
          ["ESIM", "USDT", "BNB"].forEach(function(sym) {
            var opening = esimLedgerRaw_(before[sym], "opening " + sym), closing = esimLedgerRaw_(after[sym], "closing " + sym), delta = esimLedgerGet_(c, sym) - (sym === "BNB" ? esimLedgerGet_(c, "gas") : 0n), difference = closing - opening - delta;
            [["opening", opening], ["closing", closing], ["delta", delta], ["difference", difference]].forEach(function(p) {
              rec[p[0] + sym] = esimLedgerUnit_(p[1]);
              rec.raw[p[0] + sym] = String(p[1]);
            });
            rec.differencesRaw[sym] = String(difference);
            if (difference) reconciliation.push({ day, wallet, asset: sym, differenceRaw: String(difference), difference: esimLedgerUnit_(difference) });
          });
          rec.sentCount = Number(esimLedgerGet_(c, "sentTransaction"));
          rec.nonceChange = Number(esimLedgerRaw_(after.nonce, "closing nonce") - esimLedgerRaw_(before.nonce, "opening nonce"));
          rec.gas = esimLedgerUnit_(esimLedgerGet_(c, "gas"));
          rec.bnbBuyCost = esimLedgerUnit_(esimLedgerGet_(c, "bnbBuyCost"));
          rec.lpUnsplit = Number(esimLedgerGet_(c, "lpUnsplit"));
          rec.raw.gas = String(esimLedgerGet_(c, "gas"));
          ["ESIM", "USDT"].forEach(function(sym) {
            ["\u4E70\u5165", "\u5356\u51FA", "lpIn", "lpOut", "lpFee", "deposit", "withdraw", "other", "internalIn", "internalOut", "bnbBuy"].forEach(function(prefix) {
              var raw = esimLedgerGet_(c, prefix + sym);
              rec[prefix + sym] = esimLedgerUnit_(raw);
              rec.raw[prefix + sym] = String(raw);
            });
            [[start, "opening"], [end, "closing"]].forEach(function(p) {
              var value = (lpIndex[p[0].time + "|" + wallet] || {})[sym];
              rec[p[1] + "LP" + sym] = value ? Number(String(value.n) + "e-" + value.s) : 0;
            });
          });
          rec.classificationNotes = classificationNotes[wallet] || [];
          daily.push(rec);
          var n = { day, wallet, raw: {} };
          ["buy", "sell", "internal", "deposit", "withdraw", "other"].forEach(function(key2) {
            var raw = esimLedgerGet_(nativeTotals[wallet], key2);
            n[key2] = esimLedgerUnit_(raw);
            n.raw[key2] = String(raw);
          });
          nativeCategories.push(n);
        });
        rows.sort(function(a, b) {
          return a.time.localeCompare(b.time) || a.hash.localeCompare(b.hash) || a.wallet.localeCompare(b.wallet);
        });
        flows.sort(function(a, b) {
          return a.time.localeCompare(b.time) || a.hash.localeCompare(b.hash) || a.logIndex - b.logIndex;
        });
        return {
          daily,
          transactions: rows,
          flows,
          lpEvents,
          reconciliation,
          nativeCategories,
          otherTokens,
          counts: { inputAddresses: Array.isArray(cfg.inputAddresses) ? cfg.inputAddresses.length : wallets.length, uniqueAddresses: wallets.length, transactions: rows.length, uniqueTransactions: new Set(rows.map(function(r) {
            return r.hash;
          })).size, tokenFlows: flows.length, otherTokenTransfers: otherTokens.length, reviewTransactions: rows.filter(function(r) {
            return r.needsReview;
          }).length }
        };
      }
      function esimLedgerRequire_(condition, message) {
        if (!condition) throw new Error("Ledger: " + message);
      }
      function esimLedgerRaw_(value, label) {
        esimLedgerRequire_(typeof value === "bigint" || typeof value === "number" && Number.isSafeInteger(value) || typeof value === "string" && /^(?:-?\d+|0x[0-9a-f]+)$/i.test(value), "Missing/invalid integer " + label);
        return BigInt(value);
      }
      function esimLedgerNumber_(value, label) {
        var n = esimLedgerRaw_(value, label);
        esimLedgerRequire_(n >= 0n && n <= BigInt(Number.MAX_SAFE_INTEGER), "Unsafe integer " + label);
        return Number(n);
      }
      function esimLedgerAddress_(value) {
        esimLedgerRequire_(typeof value === "string" && /^0x[0-9a-f]{40}$/i.test(value), "Invalid address");
        return value.toLowerCase();
      }
      function esimLedgerTopicAddress_(value) {
        esimLedgerRequire_(typeof value === "string" && /^0x0{24}[0-9a-f]{40}$/i.test(value), "Invalid address topic");
        return "0x" + value.slice(-40).toLowerCase();
      }
      function esimLedgerRange_(value, first, last, label) {
        var n = esimLedgerNumber_(value, label);
        esimLedgerRequire_(n >= first && n <= last, label + " outside block interval");
        return n;
      }
      function esimLedgerUnit_(raw) {
        return Number(String(raw) + "e-18");
      }
      function esimLedgerGet_(object, key2) {
        return Object.prototype.hasOwnProperty.call(object, key2) ? object[key2] : 0n;
      }
      function esimLedgerAdd_(object, key2, value) {
        object[key2] = esimLedgerGet_(object, key2) + value;
      }
      function esimLedgerBjt_(ms) {
        return new Date(ms + 8 * 36e5).toISOString().replace(/\.000Z$/, "+08:00");
      }
      function esimLedgerWords_(data) {
        esimLedgerRequire_(typeof data === "string" && /^0x(?:[0-9a-f]{64})*$/i.test(data), "Invalid ABI words");
        var out = [];
        for (var i = 2; i < data.length; i += 64) out.push(BigInt("0x" + data.slice(i, i + 64)));
        return out;
      }
      function esimLedgerSwapDelta_(kind, data) {
        var w = esimLedgerWords_(data);
        if (kind === "v2swap") return w.length >= 4 ? [w[2] - w[0], w[3] - w[1]] : null;
        if (w.length < 2) return null;
        var sign = kind === "infswap" || kind === "uniswap" ? 1n : -1n;
        return [BigInt.asIntN(256, w[0]) * sign, BigInt.asIntN(256, w[1]) * sign];
      }
      function esimLedgerNativeSale_(receipt, native, wallet, token, sold, received) {
        var entry = "0x07964f135f276412b3182a3b2407b8dd45000000", wrapped = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", zero2 = "0x0000000000000000000000000000000000000000";
        var settlements = [], withdrawals = [];
        receipt.logs.forEach(function(log) {
          if (log.removed) return;
          var topics = log.topics || [];
          if (log.address.toLowerCase() === entry && topics[0] === "0x2251435bd151cd72851a82be055bf6d1c3d7f34d08d56493dddf874229b8e897" && topics.length === 4 && esimLedgerAddress_("0x" + topics[1].slice(-40)) === token.toLowerCase() && "0x" + topics[2].slice(-40) === zero2 && "0x" + topics[3].slice(-40) === wallet) {
            var words = esimLedgerWords_(log.data);
            if (words.length >= 2 && words[0] === sold && words[1] === received) settlements.push(log);
          }
          if (log.address.toLowerCase() === wrapped && topics[0] === "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65" && topics.length === 2 && BigInt(log.data) === received) withdrawals.push("0x" + topics[1].slice(-40));
        });
        var legs = native.filter(function(t) {
          return t.from.toLowerCase() === wallet || t.to.toLowerCase() === wallet;
        });
        return settlements.length === 1 && withdrawals.length === 1 && legs.length > 0 && legs.every(function(t) {
          return t.from.toLowerCase() === withdrawals[0] && t.to.toLowerCase() === wallet;
        }) && legs.reduce(function(n, t) {
          return n + BigInt(t.amountRaw);
        }, 0n) === received;
      }
      function esimLedgerSwapRoute_(edges, from, to) {
        var zero2 = "0x0000000000000000000000000000000000000000", wrapped = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
        function canonical(a) {
          return a.toLowerCase() === wrapped ? zero2 : a.toLowerCase();
        }
        var target = canonical(to), queue = [{ asset: canonical(from), pools: [] }], seen = /* @__PURE__ */ new Set();
        while (queue.length) {
          var current = queue.shift();
          if (current.asset === target) return current.pools;
          if (seen.has(current.asset)) continue;
          seen.add(current.asset);
          edges.forEach(function(e) {
            if (canonical(e.from) === current.asset) queue.push({ asset: canonical(e.to), pools: current.pools.concat([e.pool]) });
          });
        }
        return null;
      }
      function esimLedgerDecimal_(value, label) {
        esimLedgerRequire_(typeof value === "string" || typeof value === "number", "Missing decimal " + label);
        var m = String(value).match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
        esimLedgerRequire_(m, "Invalid decimal " + label);
        var s = (m[3] || "").length - Number(m[4] || 0), n = BigInt((m[1] === "-" ? "-" : "") + m[2] + (m[3] || ""));
        esimLedgerRequire_(Math.abs(s) <= 1e3, "Decimal scale out of bounds");
        if (s < 0) {
          n *= 10n ** BigInt(-s);
          s = 0;
        }
        return { n, s };
      }
      function esimLedgerDecimalAdd_(a, b) {
        if (!a) return b;
        var s = Math.max(a.s, b.s);
        return { n: a.n * 10n ** BigInt(s - a.s) + b.n * 10n ** BigInt(s - b.s), s };
      }
      var ESIM_LP_INF_NFT = "0x55f4c8aba71a1e923edc303eb4feff14608cc226";
      var ESIM_LP_V3_NFT = "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364";
      var ESIM_LP_INF_MANAGER = "0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b";
      var ESIM_LP_SCALE = 10n ** 80n;
      var ESIM_LP_TICKS = {};
      function esimLpFail(message) {
        var error = new Error("NEEDS_REVIEW: " + message);
        error.code = "NEEDS_REVIEW";
        throw error;
      }
      function esimLpWords(data, minimum) {
        if (typeof data !== "string" || !/^0x(?:[0-9a-fA-F]{64})*$/.test(data)) esimLpFail("Malformed ABI words");
        var result = [];
        for (var i = 2; i < data.length; i += 64) result.push(BigInt("0x" + data.slice(i, i + 64)));
        if (result.length < (minimum || 0)) esimLpFail("Incomplete ABI result");
        return result;
      }
      function esimLpAddress(value) {
        return "0x" + value.toString(16).padStart(40, "0").slice(-40);
      }
      function esimLpEncode(value) {
        return BigInt.asUintN(256, BigInt(value)).toString(16).padStart(64, "0");
      }
      function esimLpBlock(block) {
        return "0x" + BigInt(block).toString(16);
      }
      function esimLpPair(token0, token1, config) {
        var token = config.token.toLowerCase(), usdt = config.usdt.toLowerCase();
        if (token0 !== token && token1 !== token) return false;
        if (!(token0 === token && token1 === usdt || token1 === token && token0 === usdt)) esimLpFail("ESIM LP pair is not ESIM/USDT");
        return true;
      }
      function esimLpIntegerSqrt(n) {
        if (n < 0n) esimLpFail("Negative square root");
        if (n < 2n) return n;
        var x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
        for (; ; ) {
          var y = (x + n / x) / 2n;
          if (y >= x) return x;
          x = y;
        }
      }
      function esimLpTickSqrt(tick) {
        if (!Number.isInteger(tick) || tick < -887272 || tick > 887272) esimLpFail("Invalid CL tick");
        if (ESIM_LP_TICKS[tick] !== void 0) return ESIM_LP_TICKS[tick];
        var base = esimLpIntegerSqrt(10001n * ESIM_LP_SCALE * ESIM_LP_SCALE / 10000n);
        var power = Math.abs(tick), result = ESIM_LP_SCALE;
        while (power) {
          if (power % 2) result = result * base / ESIM_LP_SCALE;
          power = Math.floor(power / 2);
          if (power) base = base * base / ESIM_LP_SCALE;
        }
        if (tick < 0) result = ESIM_LP_SCALE * ESIM_LP_SCALE / result;
        ESIM_LP_TICKS[tick] = result;
        return result;
      }
      function esimLpDecimal(numerator, denominator) {
        if (denominator <= 0n) esimLpFail("Invalid LP denominator");
        var negative = numerator < 0n;
        if (negative) numerator = -numerator;
        var precision = 10n ** 48n, scaled = numerator * precision / denominator;
        var whole = scaled / precision, fraction = (scaled % precision).toString().padStart(48, "0").replace(/0+$/, "");
        return (negative ? "-" : "") + whole.toString() + (fraction ? "." + fraction : "");
      }
      function esimLpAmounts(liquidity, lower, upper, sqrt) {
        if (liquidity < 0n || lower >= upper || sqrt <= 0n) esimLpFail("Invalid LP state");
        var a = esimLpTickSqrt(lower), b = esimLpTickSqrt(upper);
        var p = sqrt * ESIM_LP_SCALE / (1n << 96n), unit = 10n ** 18n;
        if (p < a) p = a;
        if (p > b) p = b;
        return [
          esimLpDecimal(liquidity * (b - p) * ESIM_LP_SCALE, p * b * unit),
          esimLpDecimal(liquidity * (p - a), ESIM_LP_SCALE * unit)
        ];
      }
      function esimLpPrice(sqrt, token0, config) {
        if (sqrt <= 0n) esimLpFail("Pool is not initialized");
        var numerator = sqrt * sqrt, denominator = 1n << 192n;
        return token0 === config.token.toLowerCase() ? esimLpDecimal(numerator, denominator) : esimLpDecimal(denominator, numerator);
      }
      function esimLpInventory(boundary, owners, config, rpc2) {
        var block = esimLpBlock(boundary.block), result = [], seen = {};
        var factoryCache = {}, poolCache = {};
        owners.forEach(function(item) {
          var manager = item.manager.toLowerCase(), owner = item.owner.toLowerCase(), nft = BigInt(item.tokenId);
          if (manager !== ESIM_LP_INF_NFT && manager !== ESIM_LP_V3_NFT) esimLpFail("Unsupported NFT manager");
          var identity = manager + ":" + nft.toString();
          if (seen[identity]) esimLpFail("Duplicate active NFT");
          seen[identity] = true;
          var value = rpc2("eth_call", [{ to: manager, data: "0x99fbab88" + esimLpEncode(nft) }, block]);
          var words = esimLpWords(value, manager === ESIM_LP_INF_NFT ? 9 : 8);
          var token0, token1, lower, upper, liquidity, pool, poolManager, slotData, protocol;
          if (manager === ESIM_LP_INF_NFT) {
            token0 = esimLpAddress(words[0]);
            token1 = esimLpAddress(words[1]);
            if (!esimLpPair(token0, token1, config)) return;
            lower = Number(BigInt.asIntN(256, words[6]));
            upper = Number(BigInt.asIntN(256, words[7]));
            liquidity = words[8];
            poolManager = esimLpAddress(words[3]);
            if (poolManager !== ESIM_LP_INF_MANAGER) esimLpFail("Unsupported Infinity pool manager");
            if (liquidity === 0n) return;
            var key2 = "0x" + value.slice(2, 2 + 64 * 6);
            pool = rpc2("web3_sha3", [key2]);
            if (!/^0x[0-9a-fA-F]{64}$/.test(pool)) esimLpFail("Invalid Infinity pool id");
            slotData = "0xc815641c" + pool.slice(2);
            protocol = "Pancake Infinity CL";
          } else {
            token0 = esimLpAddress(words[2]);
            token1 = esimLpAddress(words[3]);
            if (!esimLpPair(token0, token1, config)) return;
            lower = Number(BigInt.asIntN(256, words[5]));
            upper = Number(BigInt.asIntN(256, words[6]));
            liquidity = words[7];
            if (liquidity === 0n) return;
            var factory = factoryCache[manager];
            if (!factory) factory = factoryCache[manager] = esimLpAddress(esimLpWords(rpc2("eth_call", [{ to: manager, data: "0xc45a0155" }, block]), 1)[0]);
            var poolKey = token0 + ":" + token1 + ":" + words[4];
            pool = poolCache[poolKey];
            if (!pool) pool = poolCache[poolKey] = esimLpAddress(esimLpWords(rpc2("eth_call", [{ to: factory, data: "0x1698ee82" + esimLpEncode(token0) + esimLpEncode(token1) + esimLpEncode(words[4]) }, block]), 1)[0]);
            if (BigInt(pool) === 0n) esimLpFail("V3 pool missing");
            poolManager = pool;
            slotData = "0x3850c7bd";
            protocol = "Pancake V3";
          }
          var sqrt = esimLpWords(rpc2("eth_call", [{ to: poolManager, data: slotData }, block]), 1)[0];
          var verifiedOwner = esimLpAddress(esimLpWords(rpc2("eth_call", [{ to: manager, data: "0x6352211e" + esimLpEncode(nft) }, block]), 1)[0]);
          if (owner !== verifiedOwner) esimLpFail("NFT owner mismatch at block " + boundary.block);
          var amounts = esimLpAmounts(liquidity, lower, upper, sqrt);
          result.push({
            time: boundary.time,
            block: boundary.block,
            owner,
            manager,
            tokenId: nft.toString(),
            pool,
            poolManager,
            token0,
            token1,
            tickLower: lower,
            tickUpper: upper,
            liquidity: liquidity.toString(),
            protocol,
            amount0: amounts[0],
            amount1: amounts[1],
            sqrtPriceX96: sqrt.toString(),
            ESIM: token0 === config.token.toLowerCase() ? amounts[0] : amounts[1],
            USDT: token0 === config.usdt.toLowerCase() ? amounts[0] : amounts[1],
            priceUSDT: esimLpPrice(sqrt, token0, config)
          });
        });
        return result;
      }
      function esimLpSignatureIndex(signatures) {
        var result = {};
        Object.keys(signatures).forEach(function(key2) {
          result[signatures[key2].toLowerCase()] = key2;
        });
        return result;
      }
      function esimLpContractRevert(error) {
        if (!error || error.code === "ESIM_YIELD" || error.message === "ESIM_YIELD") return false;
        return error.contractRevert === true || /\bexecution reverted\b|\bVM Exception[^\n]*\brevert\b/i.test(String(error.rpcMessage || error.message || ""));
      }
      function esimResolvePools(receipts, config, signatures, rpc2, endBlock) {
        var inverse = esimLpSignatureIndex(signatures), candidates = {}, result = {}, block = esimLpBlock(endBlock);
        Object.keys(receipts).forEach(function(hash2) {
          (receipts[hash2].logs || []).forEach(function(event) {
            if (!event.topics || !event.topics.length) return;
            var kind = inverse[event.topics[0].toLowerCase()], address2 = event.address.toLowerCase(), id, type;
            if (!kind) return;
            if (kind === "uniswap") {
              if (!event.topics[1]) esimLpFail("Uniswap v4 pool id missing");
              id = event.topics[1].toLowerCase();
              var known = (config.referencePools || []).find(function(p) {
                return p.type === "uniswap-v4" && p.id.toLowerCase() === id && p.manager.toLowerCase() === address2;
              });
              if (!known) return;
              if (!result[id]) {
                var keyWords = esimLpWords(known.poolKey, 5);
                if (keyWords.length !== 5 || rpc2("web3_sha3", [known.poolKey]).toLowerCase() !== id) esimLpFail("Uniswap v4 PoolKey hash mismatch");
                var a0 = esimLpAddress(keyWords[0]), a1 = esimLpAddress(keyWords[1]);
                if (a0 !== known.token0.toLowerCase() || a1 !== known.token1.toLowerCase() || a0 === a1) esimLpFail("Uniswap v4 PoolKey token mismatch");
                esimLpPair(a0, a1, config);
                result[id] = { id, manager: address2, type: "uniswap-v4", token0: a0, token1: a1, poolKey: known.poolKey, swapCount: 0 };
              }
              result[id].swapCount++;
              return;
            }
            if (kind.indexOf("inf") === 0 && address2 === ESIM_LP_INF_MANAGER) {
              if (!event.topics[1]) esimLpFail("Infinity event pool id missing");
              id = event.topics[1].toLowerCase();
              type = "infinity";
            } else if (/^(v2|v3|pcsv3)/.test(kind)) {
              id = address2;
              type = "classic";
            } else return;
            if (!candidates[id]) candidates[id] = { id, manager: type === "infinity" ? ESIM_LP_INF_MANAGER : id, type, swapCount: 0 };
            if (kind.indexOf("swap") !== -1) candidates[id].swapCount++;
          });
        });
        Object.keys(candidates).sort().forEach(function(id) {
          var pool = candidates[id], words;
          if (pool.type === "infinity") {
            words = esimLpWords(rpc2("eth_call", [{ to: pool.manager, data: "0x0e2d484a" + id.slice(2) }, block]), 2);
            pool.token0 = esimLpAddress(words[0]);
            pool.token1 = esimLpAddress(words[1]);
          } else {
            var token0Value, token1Value;
            try {
              token0Value = rpc2("eth_call", [{ to: id, data: "0x0dfe1681" }, block]);
              token1Value = rpc2("eth_call", [{ to: id, data: "0xd21220a7" }, block]);
            } catch (error) {
              if (esimLpContractRevert(error)) return;
              throw error;
            }
            pool.token0 = esimLpAddress(esimLpWords(token0Value, 1)[0]);
            pool.token1 = esimLpAddress(esimLpWords(token1Value, 1)[0]);
          }
          if (pool.token0 === pool.token1 || pool.type === "classic" && (BigInt(pool.token0) === 0n || BigInt(pool.token1) === 0n)) esimLpFail("Invalid resolved token pair");
          esimLpPair(pool.token0, pool.token1, config);
          result[id] = pool;
        });
        return result;
      }
      function esimLpSplitDelta(word) {
        return [BigInt.asIntN(128, word >> 128n), BigInt.asIntN(128, word & (1n << 128n) - 1n)];
      }
      function esimLpAdd(target, key2, value) {
        target[key2] = (target[key2] || 0n) + value;
      }
      function esimLpCashflows(receipts, transactions, pools, signatures, traces, config) {
        var inverse = esimLpSignatureIndex(signatures), byTransaction = {}, details = [];
        var selector = (signatures.modifyLiquidity || "0x9371d115").slice(0, 10).toLowerCase();
        Object.keys(receipts).sort().forEach(function(hash2) {
          var receipt = receipts[hash2], events = [];
          if (receipt.status !== void 0 && BigInt(receipt.status) === 0n) return;
          (receipt.logs || []).forEach(function(event) {
            if (!event.topics || !event.topics.length) return;
            var kind = inverse[event.topics[0].toLowerCase()], address2 = event.address.toLowerCase();
            if (kind !== "inflp" && !/^v[23](mint|burn|collect)$/.test(kind || "")) return;
            if (kind === "inflp" && address2 !== ESIM_LP_INF_MANAGER) return;
            var id = kind === "inflp" ? event.topics[1].toLowerCase() : address2, pool = pools[id];
            if (!pool) esimLpFail("LP event pool not resolved");
            if (!esimLpPair(pool.token0, pool.token1, config)) return;
            if (kind.indexOf("v2") === 0) esimLpFail("V2 ESIM LP requires separate accounting");
            events.push({ kind, event, pool });
          });
          if (!events.length) return;
          if (!transactions[hash2] || !transactions[hash2].from) esimLpFail("LP transaction initiator missing");
          var wallet = transactions[hash2].from.toLowerCase(), total = {}, infEvents = events.filter(function(e) {
            return e.kind === "inflp";
          });
          if (infEvents.length) {
            var trace = traces[hash2];
            if (!trace) esimLpFail("Infinity trace missing");
            var todo = [trace], matched = 0, eventPositions = {};
            infEvents.forEach(function(record) {
              var eventWords = esimLpWords(record.event.data, 4);
              var positionKey2 = eventWords[3].toString() + ":" + BigInt.asIntN(256, eventWords[2]).toString();
              eventPositions[positionKey2] = (eventPositions[positionKey2] || 0) + 1;
            });
            while (todo.length) {
              var frame = todo.pop();
              if (frame.error) continue;
              (frame.calls || []).forEach(function(child) {
                todo.push(child);
              });
              if ((frame.input || "").slice(0, 10).toLowerCase() !== selector) continue;
              var input = esimLpWords("0x" + frame.input.slice(10), 10), assets = [esimLpAddress(input[0]), esimLpAddress(input[1])];
              if (!esimLpPair(assets[0], assets[1], config)) continue;
              if ((frame.to || "").toLowerCase() !== ESIM_LP_INF_MANAGER || (frame.from || "").toLowerCase() !== ESIM_LP_INF_NFT || esimLpAddress(input[3]) !== ESIM_LP_INF_MANAGER) esimLpFail("Unsupported Infinity trace manager");
              var positionKey = input[9].toString() + ":" + BigInt.asIntN(256, input[8]).toString();
              if (!eventPositions[positionKey]) esimLpFail("Infinity event/trace position mismatch");
              eventPositions[positionKey]--;
              var output = esimLpWords(frame.output, 2), delta = esimLpSplitDelta(output[0]), fees = esimLpSplitDelta(output[1]);
              matched++;
              assets.forEach(function(token, index) {
                var sym = token === config.token.toLowerCase() ? "ESIM" : "USDT", fee = fees[index], principal = delta[index] - fee;
                if (fee < 0n) esimLpFail("Negative settled LP fee");
                esimLpAdd(total, "lpIn" + sym, principal < 0n ? -principal : 0n);
                esimLpAdd(total, "lpOut" + sym, principal > 0n ? principal : 0n);
                esimLpAdd(total, "lpFee" + sym, fee);
                details.push({
                  hash: hash2,
                  wallet,
                  asset: sym,
                  principalDeltaRaw: principal.toString(),
                  feeRaw: fee.toString(),
                  positionManager: frame.from.toLowerCase(),
                  poolManager: frame.to.toLowerCase(),
                  tokenId: input[9].toString(),
                  liquidityDeltaRaw: BigInt.asIntN(256, input[8]).toString()
                });
              });
            }
            if (matched !== infEvents.length) esimLpFail("Infinity event/trace split mismatch");
          }
          var v3 = events.filter(function(e) {
            return e.kind.indexOf("v3") === 0;
          });
          if (v3.length) {
            var perPool = {}, principalIn = {}, principalOut = {}, collected = {};
            v3.forEach(function(record) {
              var pool = record.pool, words = esimLpWords(record.event.data, record.kind === "v3mint" ? 4 : 3);
              var amounts = record.kind === "v3mint" ? words.slice(2, 4) : words.slice(1, 3);
              var positionKey2 = pool.id + ":" + record.event.topics.slice(1, 4).join(":").toLowerCase();
              var bucket = perPool[positionKey2] || (perPool[positionKey2] = { input: {}, output: {}, collected: {}, sawBurn: false });
              var type = record.kind === "v3mint" ? "input" : record.kind === "v3burn" ? "output" : "collected";
              if (record.kind === "v3burn" && words[0] > 0n) bucket.sawBurn = true;
              [pool.token0, pool.token1].forEach(function(token, index) {
                esimLpAdd(bucket[type], token === config.token.toLowerCase() ? "ESIM" : "USDT", amounts[index]);
              });
            });
            Object.keys(perPool).forEach(function(id) {
              var bucket = perPool[id];
              ["ESIM", "USDT"].forEach(function(sym) {
                if (!bucket.sawBurn && (bucket.collected[sym] || 0n) > 0n) esimLpFail("V3 deferred collection cannot be assumed to be fees");
                if ((bucket.collected[sym] || 0n) < (bucket.output[sym] || 0n)) esimLpFail("V3 deferred principal must be tracked separately");
                esimLpAdd(principalIn, sym, bucket.input[sym] || 0n);
                esimLpAdd(principalOut, sym, bucket.output[sym] || 0n);
                esimLpAdd(collected, sym, bucket.collected[sym] || 0n);
              });
            });
            ["ESIM", "USDT"].forEach(function(sym) {
              var fee = collected[sym] - principalOut[sym];
              esimLpAdd(total, "lpIn" + sym, principalIn[sym]);
              esimLpAdd(total, "lpOut" + sym, principalOut[sym]);
              esimLpAdd(total, "lpFee" + sym, fee);
              details.push({ hash: hash2, wallet, asset: sym, principalDeltaRaw: (principalOut[sym] - principalIn[sym]).toString(), feeRaw: fee.toString(), positionManager: "Pancake V3", poolManager: v3[0].pool.id, tokenId: "\u89C1NFT\u6D41\u6C34", liquidityDeltaRaw: "" });
            });
          }
          byTransaction[hash2] = {};
          Object.keys(total).forEach(function(key2) {
            byTransaction[hash2][key2] = total[key2].toString();
          });
        });
        return { byTransaction, details };
      }
      function esimReferencePrice(boundary, pools, config, rpc2) {
        var candidates = Object.keys(pools).map(function(key2) {
          return pools[key2];
        }).filter(function(pool2) {
          return pool2.type !== "uniswap-v4" && esimLpPair(pool2.token0, pool2.token1, config);
        });
        var fallback = config.referencePools || [], observedCount = candidates.length, seen = {}, skippedClassic = false;
        function ranking(a, b) {
          return (b.swapCount || 0) - (a.swapCount || 0) || a.id.localeCompare(b.id);
        }
        candidates.sort(ranking);
        candidates.forEach(function(pool2) {
          seen[pool2.id] = true;
        });
        var historical = Object.keys(fallback).map(function(key2) {
          return fallback[key2];
        }).filter(function(pool2) {
          return pool2.type !== "uniswap-v4" && !seen[pool2.id] && (observedCount === 0 || pool2.type === "classic") && esimLpPair(pool2.token0, pool2.token1, config);
        }).sort(ranking);
        candidates = candidates.concat(historical);
        for (var i = 0; i < candidates.length; i++) {
          var pool = candidates[i];
          if (pool.type === "infinity" && pool.manager !== ESIM_LP_INF_MANAGER) esimLpFail("Reference pool manager is not canonical");
          if (pool.type !== "infinity" && pool.type !== "classic") esimLpFail("Unsupported reference pool type");
          var data = pool.type === "infinity" ? "0xc815641c" + pool.id.slice(2) : "0x3850c7bd";
          var value;
          try {
            value = rpc2("eth_call", [{ to: pool.manager, data }, esimLpBlock(boundary.block)]);
          } catch (error) {
            if (pool.type === "classic" && esimLpContractRevert(error)) {
              skippedClassic = true;
              continue;
            }
            throw error;
          }
          var words = esimLpWords(value, 1);
          if (words[0] === 0n) continue;
          var price = Number(esimLpPrice(words[0], pool.token0, config));
          if (!Number.isFinite(price) || price <= 0) esimLpFail("Invalid reference price");
          var method = "Most-used verified ESIM/USDT pool in this cohort; block-pinned sqrtPriceX96";
          if (skippedClassic) method = "Fallback verified ESIM/USDT slot0 pool after unsupported classic candidates; block-pinned sqrtPriceX96";
          else if (i >= observedCount) method = "Fallback known verified ESIM/USDT pool; block-pinned sqrtPriceX96";
          return { time: boundary.time, block: boundary.block, price, pool: pool.id, manager: pool.manager, method };
        }
        esimLpFail("No initialized verified ESIM/USDT reference pool at boundary");
      }
      function esimTransferPages(params) {
        var rows = [], page = null, seen = /* @__PURE__ */ new Set(), reset = 0;
        do {
          var p = Object.assign({}, params);
          if (page) p.pageKey = page;
          var r;
          try {
            r = esimRpc("alchemy_getAssetTransfers", [p]);
          } catch (e) {
            if (!e.expiredPage || reset++) throw e;
            esimClearTransferCache(params);
            rows = [];
            page = null;
            seen = /* @__PURE__ */ new Set();
            r = esimRpc("alchemy_getAssetTransfers", [params]);
          }
          if (!r || !Array.isArray(r.transfers)) throw new Error("\u94FE\u4E0A\u5206\u9875\u8FD4\u56DE\u6570\u636E\u4E0D\u5B8C\u6574");
          rows = rows.concat(r.transfers);
          page = r.pageKey || null;
          if (page) {
            if (seen.has(page) || seen.size >= 100) throw new Error("\u94FE\u4E0A\u5206\u9875\u91CD\u590D\u6216\u8FC7\u591A\uFF0C\u9700\u8981\u590D\u6838");
            seen.add(page);
          }
        } while (page);
        return rows;
      }
      function esimClearTransferCache(params) {
        if (!ESIM_JOB) return;
        Object.keys(ESIM_JOB.rpc).forEach((k) => {
          var c = JSON.parse(k);
          if (c[0] !== "alchemy_getAssetTransfers") return;
          var p = Object.assign({}, c[1][0]);
          delete p.pageKey;
          if (JSON.stringify(p) === JSON.stringify(params)) delete ESIM_JOB.rpc[k];
        });
      }
      function esimFreshBoundaryCheck(j) {
        var calls = j.state.boundaries.map((b) => ["eth_getBlockByNumber", [esimHex(b.block), false]]);
        calls.forEach((c) => {
          delete j.rpc[JSON.stringify(c)];
        });
        var headers = esimRpcMany(calls);
        if (headers.some((b, i) => !b.hash || b.hash !== j.boundaryHashes[i])) throw new Error("\u7EDF\u8BA1\u8FB9\u754C\u533A\u5757\u6709\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u91C7\u96C6\uFF1B\u539F\u6570\u636E\u4E0D\u53D8");
      }
      function esimUniqueTransfers(rows) {
        var map = {};
        rows.forEach((r) => {
          if (!r.uniqueId || !r.hash || !r.blockNum) throw new Error("\u8F6C\u8D26\u6570\u636E\u7F3A\u5C11\u6807\u8BC6");
          if (map[r.uniqueId] && !__require("node:util").isDeepStrictEqual(map[r.uniqueId], r)) throw new Error("\u540C\u4E00\u8F6C\u8D26\u51FA\u73B0\u51B2\u7A81\u6570\u636E");
          map[r.uniqueId] = r;
        });
        return Object.values(map).sort((a, b) => Number(BigInt(a.blockNum) - BigInt(b.blockNum)) || a.uniqueId.localeCompare(b.uniqueId));
      }
      function esimNftOwners(seed, events, block) {
        var owners = {};
        seed.forEach((x) => {
          owners[x.manager + ":" + x.tokenId] = Object.assign({}, x);
        });
        events.slice().sort((a, b) => Number(BigInt(a.blockNum) - BigInt(b.blockNum)) || Number(a.uniqueId.split(":").pop()) - Number(b.uniqueId.split(":").pop())).forEach((e) => {
          if (Number(BigInt(e.blockNum)) <= block) {
            var m = e.rawContract.address, n = BigInt(e.tokenId).toString();
            owners[m + ":" + n] = { manager: m, tokenId: n, owner: e.to };
          }
        });
        return Object.values(owners).filter((x) => ESIM_CFG.addresses.includes(x.owner));
      }
      function esimNftStartBlock(wallet) {
        return 0;
      }
      function esimVerifyNftOwnerCounts(owners, boundary) {
        var managers = ["0x55f4c8aba71a1e923edc303eb4feff14608cc226", "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364"];
        var pairs = ESIM_CFG.addresses.flatMap((a) => managers.map((m) => ({ wallet: a, manager: m }))), hex4 = esimHex(boundary.block);
        var values = esimRpcMany(pairs.map((p) => ["eth_call", [{ to: p.manager, data: "0x70a08231" + p.wallet.slice(2).padStart(64, "0") }, hex4]]));
        if (values.length !== pairs.length) throw new Error("LP NFT\u5F52\u5C5E\u6570\u91CF\u672A\u5B8C\u6574\u6838\u5BF9");
        pairs.forEach((p, i) => {
          var count = owners.filter((o) => o.owner === p.wallet && o.manager === p.manager).length;
          if (BigInt(values[i]) !== BigInt(count)) throw new Error("LP NFT\u5386\u53F2\u6570\u91CF\u672A\u6838\u5BF9\u4E0A\uFF0C\u505C\u6B62\u53D1\u5E03\uFF1B\u539F\u6570\u636E\u4E0D\u53D8");
        });
      }
      function esimNativeFromTraces(traces) {
        var out = [];
        Object.keys(traces).sort().forEach((h) => {
          var stack = [[traces[h], []]];
          while (stack.length) {
            var p = stack.pop(), f = p[0], path = p[1];
            if (f.error) continue;
            (f.calls || []).forEach((c, i) => stack.push([c, path.concat(i)]));
            var n = BigInt(f.value || "0x0");
            if (n > 0n && ["CALL", "CREATE", "CREATE2", "SELFDESTRUCT"].includes(f.type) && (ESIM_CFG.addresses.includes(f.from) || ESIM_CFG.addresses.includes(f.to))) out.push({ hash: h, from: f.from, to: f.to, amountRaw: n.toString(), tracePath: path });
          }
        });
        return out;
      }
      function esimFetchTransactions(j, hashes) {
        var result = esimRpcMany(hashes.flatMap((h) => [["eth_getTransactionReceipt", [h]], ["eth_getTransactionByHash", [h]]]));
        hashes.forEach((h, i) => {
          j.receipts[h] = result[i * 2];
          j.transactions[h] = result[i * 2 + 1];
        });
      }
      function esimPrepareNonceGaps(j) {
        var known = {};
        Object.values(j.transactions).forEach((t) => {
          if (ESIM_CFG.addresses.includes(t.from)) known[t.from + ":" + Number(BigInt(t.nonce))] = true;
        });
        var gaps = [];
        ESIM_CFG.addresses.forEach((a) => {
          var b = j.balances.find((r) => r.address === a && r.time === j.state.boundaries[0].time), e = j.balances.find((r) => r.address === a && r.time === j.state.boundaries[1].time);
          if (!b || !e) throw new Error("\u7F3A\u5C11\u94B1\u5305\u8D77\u6B62\u4F59\u989D");
          for (var n = b.nonce; n < e.nonce; n++) if (!known[a + ":" + n]) gaps.push({ wallet: a, nonce: n, lo: b.block + 1, hi: e.block });
        });
        if (gaps.length > 2e3) throw new Error("\u5F85\u8865\u67E5\u4EA4\u6613\u8FC7\u591A\uFF0C\u9700\u8981\u4EBA\u5DE5\u590D\u6838");
        return gaps;
      }
      function esimRecoverNonce(gap) {
        var lo = gap.lo, hi = gap.hi;
        while (lo < hi) {
          var mid = Math.floor((lo + hi) / 2), n = Number(BigInt(esimRpc("eth_getTransactionCount", [gap.wallet, esimHex(mid)])));
          if (n > gap.nonce) hi = mid;
          else lo = mid + 1;
        }
        var block = esimRpc("eth_getBlockByNumber", [esimHex(lo), true]), tx = (block.transactions || []).filter((t) => t.from === gap.wallet && Number(BigInt(t.nonce)) === gap.nonce);
        if (tx.length) return tx.map((t) => t.hash);
        var auth = (block.transactions || []).filter((t) => t.type === "0x4");
        if (!auth.length) throw new Error("\u6709\u5DF2\u53D1\u9001\u4EA4\u6613\u6CA1\u6709\u627E\u5230\uFF0C\u505C\u6B62\u8986\u76D6\u539F\u6570\u636E");
        return auth.map((t) => t.hash);
      }
      function esimResidualHashes(j, error) {
        var wallet = error.wallet, changes = {}, start = j.state.boundaries[0].block, end = j.state.boundaries[1].block;
        function add(b, n) {
          changes[b] = (changes[b] || 0n) + n;
        }
        j.nativeTransfers.forEach((t) => {
          var b = Number(BigInt(j.receipts[t.hash].blockNumber)), v = BigInt(t.amountRaw);
          if (t.from === wallet) add(b, -v);
          if (t.to === wallet) add(b, v);
        });
        Object.entries(j.receipts).forEach(([h, r]) => {
          var t = j.transactions[h];
          if (t.from === wallet) add(Number(BigInt(r.blockNumber)), -BigInt(r.gasUsed) * BigInt(r.effectiveGasPrice || t.gasPrice));
        });
        var blocks = Object.keys(changes).map(Number).sort((a, b) => a - b), prefix = [0n];
        blocks.forEach((b) => prefix.push(prefix[prefix.length - 1] + changes[b]));
        function index(n) {
          var a = 0, b = blocks.length;
          while (a < b) {
            var m = Math.floor((a + b) / 2);
            if (blocks[m] <= n) a = m + 1;
            else b = m;
          }
          return a;
        }
        function balance(n) {
          return BigInt(esimRpc("eth_getBalance", [wallet, esimHex(n)]));
        }
        var leaves = [];
        function walk2(lo, hi) {
          esimBudget();
          if (balance(hi) - balance(lo) - prefix[index(hi)] + prefix[index(lo)] === 0n) return;
          if (hi - lo === 1) {
            leaves.push(hi);
            return;
          }
          var m = Math.floor((lo + hi) / 2);
          walk2(lo, m);
          walk2(m, hi);
        }
        walk2(start, end);
        var hashes = /* @__PURE__ */ new Set();
        leaves.forEach((b) => ["fromAddress", "toAddress"].forEach((dir) => {
          for (var after = 0; after < 1e4; after += 1e3) {
            var p = { fromBlock: esimHex(b), toBlock: esimHex(b), count: 1e3, after };
            p[dir] = [wallet];
            var traces = esimRpc("trace_filter", [p]);
            if (!Array.isArray(traces)) throw new Error("BNB\u8865\u67E5\u8FD4\u56DE\u4E0D\u5B8C\u6574");
            traces.forEach((t) => {
              if (t.transactionHash) hashes.add(t.transactionHash);
            });
            if (traces.length < 1e3) break;
            if (after === 9e3) throw new Error("BNB\u8865\u67E5\u8D85\u51FA\u5206\u9875\u4E0A\u9650");
          }
        }));
        return Array.from(hashes);
      }
      function esimCollectStep(j) {
        var cfg = ESIM_CFG;
        ESIM_JOB = j;
        esimBudget();
        if (j.stage === "init") {
          if (Number(BigInt(esimRpc("eth_chainId", []))) !== 56) throw new Error("\u63A5\u53E3\u4E0D\u662FBNB\u4E3B\u7F51");
          var decimals = esimRpcMany([cfg.token, cfg.usdt].map((t) => ["eth_call", [{ to: t, data: "0x313ce567" }, "latest"]]));
          if (decimals.some((x) => BigInt(x) !== 18n)) throw new Error("\u4EE3\u5E01\u7CBE\u5EA6\u4E0E\u539F\u8868\u4E0D\u4E00\u81F4");
          var head = esimRpc("eth_getBlockByNumber", ["latest", false]), high = Number(BigInt(head.number)) - 64;
          var start = esimIso(j.day), end = j.partial ? j.endIso : esimIso(esimPlusDay(j.day, 1));
          if (!end || Date.parse(end) <= Date.parse(start) || Date.parse(end) > Date.parse(esimIso(esimPlusDay(j.day, 1)))) throw new Error("\u7EDF\u8BA1\u622A\u6B62\u65F6\u95F4\u65E0\u6548");
          var startB = esimBeforeTime(Date.parse(start) / 1e3, high), endB = esimBeforeTime(Date.parse(end) / 1e3, high);
          j.state = { config: cfg, startBlock: startB + 1, endBlock: endB, boundaries: [{ time: start, block: startB }, { time: end, block: endB }], cutoff: end };
          j.boundaryHashes = esimRpcMany([startB, endB].map((b) => ["eth_getBlockByNumber", [esimHex(b), false]])).map((b) => b.hash);
          j.transfers = [];
          j.nftTransfers = [];
          j.receipts = {};
          j.transactions = {};
          j.balances = [];
          j.traces = {};
          j.index = 0;
          j.stage = "transfers";
          return;
        }
        if (j.stage === "transfers" || j.stage === "nfts") {
          if (j.index >= cfg.addresses.length * 2) {
            if (j.stage === "transfers") {
              j.transfers = esimUniqueTransfers(j.transfers);
              j.stage = "nfts";
              j.index = 0;
            } else {
              j.nftTransfers = esimUniqueTransfers(j.nftTransfers);
              j.hashes = Array.from(new Set(j.transfers.map((t) => t.hash))).sort();
              j.stage = "transactions";
              j.index = 0;
            }
            return;
          }
          var nft = j.stage === "nfts", wallet = cfg.addresses[Math.floor(j.index / 2)], p = { fromBlock: esimHex(nft ? esimNftStartBlock(wallet) : j.state.startBlock), toBlock: esimHex(j.state.endBlock), category: nft ? ["erc721"] : ["external", "erc20", "erc721", "erc1155"], excludeZeroValue: false, withMetadata: true, maxCount: "0x3e8", order: "asc" };
          p[j.index % 2 ? "toAddress" : "fromAddress"] = cfg.addresses[Math.floor(j.index / 2)];
          if (nft) p.contractAddresses = ["0x55f4c8aba71a1e923edc303eb4feff14608cc226", "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364"];
          var rows = esimTransferPages(p);
          if (nft) j.nftTransfers = j.nftTransfers.concat(rows);
          else j.transfers = j.transfers.concat(rows);
          j.index++;
          return;
        }
        if (j.stage === "transactions") {
          if (j.index >= j.hashes.length) {
            j.stage = "balances";
            j.index = 0;
            return;
          }
          var hashes = j.hashes.slice(j.index, j.index + 20);
          esimFetchTransactions(j, hashes);
          j.index += hashes.length;
          return;
        }
        if (j.stage === "balances") {
          if (j.index >= cfg.addresses.length * 2) {
            j.gaps = esimPrepareNonceGaps(j);
            j.stage = "nonces";
            j.index = 0;
            return;
          }
          var boundary = j.state.boundaries[Math.floor(j.index / cfg.addresses.length)], a = cfg.addresses[j.index % cfg.addresses.length], hex4 = esimHex(boundary.block);
          var values = esimRpcMany([cfg.token, cfg.usdt].map((t) => ["eth_call", [{ to: t, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex4]]).concat([["eth_getBalance", [a, hex4]], ["eth_getTransactionCount", [a, hex4]]]));
          j.balances.push({ address: a, time: boundary.time, block: boundary.block, ESIM: BigInt(values[0]).toString(), USDT: BigInt(values[1]).toString(), BNB: BigInt(values[2]).toString(), nonce: Number(BigInt(values[3])) });
          j.index++;
          return;
        }
        if (j.stage === "nonces") {
          if (j.index >= j.gaps.length) {
            j.hashes = Object.keys(j.receipts).filter((h) => j.receipts[h].status === "0x1").sort();
            j.stage = "traces";
            j.index = 0;
            return;
          }
          esimFetchTransactions(j, esimRecoverNonce(j.gaps[j.index]));
          j.index++;
          return;
        }
        if (j.stage === "traces") {
          if (j.index >= j.hashes.length) {
            j.nativeTransfers = esimNativeFromTraces(j.traces);
            j.stage = "lp";
            return;
          }
          var hs = j.hashes.slice(j.index, j.index + 10), traces = esimRpcMany(hs.map((h) => ["debug_traceTransaction", [h, { tracer: "callTracer" }]]));
          hs.forEach((h, i) => j.traces[h] = traces[i]);
          j.index += hs.length;
          return;
        }
        if (j.stage === "lp") {
          j.pools = esimResolvePools(j.receipts, cfg, ESIM_SIGNATURES, esimRpc, j.state.endBlock);
          j.lpCashflows = esimLpCashflows(j.receipts, j.transactions, j.pools, ESIM_SIGNATURES, j.traces, cfg);
          j.lpInventory = j.state.boundaries.flatMap((b) => {
            var owners = esimNftOwners(cfg.nftSeed, j.nftTransfers, b.block);
            esimVerifyNftOwnerCounts(owners, b);
            return esimLpInventory(b, owners, cfg, esimRpc);
          });
          j.price = esimReferencePrice(j.state.boundaries[1], j.pools, cfg, esimRpc);
          if (!j.price || !Number.isFinite(j.price.price) || j.price.price <= 0) throw new Error("\u672A\u53D6\u5F97\u6709\u6548\u671F\u672B\u53C2\u8003\u4EF7\uFF0C\u539F\u6570\u636E\u4E0D\u53D8");
          j.blockTimes = {};
          j.transfers.forEach((t) => {
            if (t.metadata && t.metadata.blockTimestamp) j.blockTimes[Number(BigInt(t.blockNum))] = t.metadata.blockTimestamp;
          });
          j.stage = "times";
          j.index = 0;
          j.blocks = Array.from(new Set(Object.values(j.receipts).map((r) => Number(BigInt(r.blockNumber))))).filter((b) => !j.blockTimes[b]);
          return;
        }
        if (j.stage === "times") {
          if (j.index >= j.blocks.length) {
            j.stage = "analyze";
            return;
          }
          var bs = j.blocks.slice(j.index, j.index + 20), headers = esimRpcMany(bs.map((b) => ["eth_getBlockByNumber", [esimHex(b), false]]));
          bs.forEach((b, i) => j.blockTimes[b] = new Date(Number(BigInt(headers[i].timestamp)) * 1e3).toISOString());
          j.index += bs.length;
          return;
        }
        if (j.stage === "analyze") {
          j.result = esimAnalyzeDay({ state: j.state, transfers: j.transfers, receipts: j.receipts, transactions: j.transactions, balances: j.balances, lpInventory: j.lpInventory, lpCashflows: j.lpCashflows, nativeTransfers: j.nativeTransfers, pools: j.pools, signatures: ESIM_SIGNATURES, blockTimes: j.blockTimes });
          var errors = j.result.reconciliation || [];
          if (errors.some((x) => x.asset !== "BNB")) throw new Error("\u5E01\u6216U\u7684\u4F59\u989D\u6CA1\u6709\u6838\u5BF9\u4E0A\uFF1B\u53EF\u80FD\u6570\u636E\u63A5\u53E3\u5C1A\u672A\u6536\u9F50\uFF0C\u539F\u6570\u636E\u4E0D\u53D8");
          if (errors.length) {
            if ((j.residualRounds || 0) >= 2) throw new Error("BNB\u4F59\u989D\u8865\u67E5\u540E\u4ECD\u6709\u5DEE\u989D\uFF0C\u9700\u8981\u4EBA\u5DE5\u590D\u6838");
            j.reconciliationErrors = errors;
            j.extraHashes = [];
            j.stage = "residual";
            j.index = 0;
            return;
          }
          esimAssertPublishable(j.result);
          j.stage = "ready";
          return;
        }
        if (j.stage === "residual") {
          if (!Array.isArray(j.reconciliationErrors)) throw new Error("BNB\u8865\u67E5\u5217\u8868\u7F3A\u5931\uFF0C\u9700\u8981\u91CD\u65B0\u6838\u5BF9");
          if (j.index >= j.reconciliationErrors.length) {
            j.hashes = Array.from(new Set(j.extraHashes));
            j.stage = "extra";
            j.index = 0;
            j.residualRounds = (j.residualRounds || 0) + 1;
            return;
          }
          j.extraHashes = j.extraHashes.concat(esimResidualHashes(j, j.reconciliationErrors[j.index]));
          j.index++;
          return;
        }
        if (j.stage === "extra") {
          if (j.index >= j.hashes.length) {
            j.hashes = Object.keys(j.receipts).filter((h) => j.receipts[h].status === "0x1").sort();
            j.stage = "traces";
            j.index = 0;
            return;
          }
          var extra = j.hashes.slice(j.index, j.index + 20);
          esimFetchTransactions(j, extra);
          j.index += extra.length;
          return;
        }
        if (j.stage !== "ready" && j.stage !== "done") throw new Error("\u91C7\u96C6\u8FDB\u5EA6\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
      }
      function esimSumFormula(col, asset, row, last) {
        last = Math.max(8, last);
        return "SUMIFS('\u5730\u5740\u660E\u7EC6'!$" + col + "$8:$" + col + "$" + last + ",'\u5730\u5740\u660E\u7EC6'!$A$8:$A$" + last + ",$O" + row + ",'\u5730\u5740\u660E\u7EC6'!$C$8:$C$" + last + ',"' + asset + '")';
      }
      function esimDailyRow(day, status, price, end, row, last) {
        var s = (c, a) => esimSumFormula(c, a, row, last), i = row;
        var lp = "=IF(" + s("G", "ESIM") + "+" + s("G", "USDT") + "+" + s("H", "ESIM") + "+" + s("H", "USDT") + '=0,"\u2013","\u52A0\u6C60 "&TEXT(' + s("G", "ESIM") + ',"#,##0.00")&"\u5E01 / "&TEXT(' + s("G", "USDT") + ',"#,##0.00")&"U"&CHAR(10)&"\u64A4\u6C60 "&TEXT(' + s("H", "ESIM") + ',"#,##0.00")&"\u5E01 / "&TEXT(' + s("H", "USDT") + ',"#,##0.00")&"U")';
        var copy = "=TEXT(O" + i + "+" + ESIM_CFG.dailyStartHour + '/24,"yymmdd hh:mm")&"-"&TEXT(P' + i + ',"mmdd hh:mm")&"\uFF0C\u4E70\u5165 "&TEXT(B' + i + ',"#,##0.00")&" ESIM\uFF0C\u4ED8U "&TEXT(C' + i + ',"#,##0.00")&IF(' + s("E", "BNB") + '<0,"\uFF0C\u53E6\u4ED8BNB "&TEXT(-' + s("E", "BNB") + ',"0.00000000"),"")&"\uFF1B\u5356\u51FA "&TEXT(D' + i + ',"#,##0.00")&" ESIM\uFF0C\u6536U "&TEXT(E' + i + ',"#,##0.00")&"\uFF1B\u51C0\u5E01 "&TEXT(F' + i + ',"+#,##0.00;-#,##0.00;0.00")&"\uFF0C\u51C0U "&TEXT(G' + i + ',"+#,##0.00;-#,##0.00;0.00")&"\uFF1B\u671F\u672B "&TEXT(H' + i + ',"#,##0.00")&" ESIM\u3001"&TEXT(I' + i + ',"#,##0.00")&" U\uFF08\u542BLP\u672C\u91D1\uFF09\u3002"&IF(N' + i + '="\u8FDB\u884C\u4E2D","\u672C\u65E5\u5C1A\u672A\u7ED3\u7B97\u3002",IF(N' + i + '="\u5F85\u6838\u9A8C","\u672C\u65E5\u6570\u636E\u5F85\u6838\u9A8C\uFF0C\u6682\u52FF\u7528\u4E8E\u6B63\u5F0F\u7EDF\u8BA1\u3002",""))';
        return ["=TEXT(O" + i + ',"yymmdd")&"-"&TEXT(O' + i + '+1,"mmdd")', "=" + s("E", "ESIM"), "=-" + s("E", "USDT"), "=-" + s("F", "ESIM"), "=" + s("F", "USDT"), "=B" + i + "-D" + i, "=E" + i + "-C" + i, "=" + s("O", "ESIM") + "+" + s("Q", "ESIM"), "=" + s("O", "USDT") + "+" + s("Q", "USDT"), price, "=H" + i + "*J" + i + "+I" + i, lp, copy, status, esimSerial(day), end];
      }
      function esimBuildView(oldDaily, oldDetail, job) {
        esimAssertPublishable(job.result);
        var key2 = esimSerial(job.day), map = {}, newDetail = [], newNotes = [];
        oldDaily.forEach((r) => {
          if (!r.length) return;
          if (!Number.isSafeInteger(r[14]) || !Number.isFinite(r[15]) || !Number.isFinite(r[9])) throw new Error("\u73B0\u6709\u6C47\u603B\u65E5\u671F\u6216\u4EF7\u683C\u88AB\u6539\u52A8\uFF0C\u8BF7\u5148\u68C0\u67E5");
          if (!["\u5DF2\u5B8C\u6210", "\u8FDB\u884C\u4E2D", "\u5F85\u6838\u9A8C"].includes(r[13])) throw new Error("\u73B0\u6709\u6C47\u603B\u7EDF\u8BA1\u72B6\u6001\u65E0\u6548\uFF0C\u8BF7\u5148\u68C0\u67E5\u5E03\u5C40\u7248\u672C");
          if (map[r[14]]) throw new Error("\u73B0\u6709\u6C47\u603B\u6709\u91CD\u590D\u65E5\u671F");
          map[r[14]] = { day: esimDayFromSerial(r[14]), status: r[13], price: r[9], end: r[15] };
        });
        map[key2] = { day: job.day, status: job.partial ? "\u8FDB\u884C\u4E2D" : "\u5DF2\u5B8C\u6210", price: job.price.price, end: esimSerial(job.state.boundaries[1].time) };
        if (oldDetail.some((r) => !Number.isSafeInteger(r[0]) || r[0] < esimSerial(ESIM_CFG.startDay))) throw new Error("\u5730\u5740\u660E\u7EC6\u65E5\u671F\u5FC5\u987B\u662F\u6709\u6548\u65E5\u671F\uFF0C\u4E0D\u80FD\u662F\u6587\u5B57\u6216\u7A7A\u767D");
        var start = oldDetail.findIndex((r) => r[0] <= key2);
        if (start < 0) start = oldDetail.length;
        var oldCount = oldDetail.filter((r) => r[0] === key2).length;
        for (var j = 1; j < oldDetail.length; j++) if (oldDetail[j][0] > oldDetail[j - 1][0]) throw new Error("\u5730\u5740\u660E\u7EC6\u65E5\u671F\u987A\u5E8F\u88AB\u6539\u53D8\uFF0C\u8BF7\u5148\u6309\u65E5\u671F\u5012\u5E8F\uFF08\u6700\u8FD1\u5728\u4E0A\uFF09\u518D\u66F4\u65B0");
        var ns = {};
        job.result.nativeCategories.forEach((n) => {
          if (n.day === job.day) ns[n.wallet] = n;
        });
        job.result.daily.forEach((r) => {
          if (r.day !== job.day) throw new Error("\u91C7\u96C6\u65E5\u671F\u4E0E\u76EE\u6807\u65E5\u671F\u4E0D\u4E00\u81F4");
          var active = r.txCount || ["ESIM", "USDT", "BNB"].some((s) => r["opening" + s] || r["closing" + s]) || ["ESIM", "USDT"].some((s) => r["openingLP" + s] || r["closingLP" + s]);
          if (!active) return;
          var ix = ESIM_CFG.addresses.indexOf(r.wallet) + 1, link = '=HYPERLINK("https://bscscan.com/address/' + r.wallet + '","' + String(ix).padStart(2, "0") + "  " + r.wallet.slice(0, 8) + "\u2026" + r.wallet.slice(-6) + '")';
          ["ESIM", "USDT", "BNB"].forEach((asset) => {
            var vals;
            if (asset === "BNB") {
              var n = ns[r.wallet];
              if (!n) throw new Error("BNB\u5206\u7C7B\u7F3A\u5931");
              vals = [r.openingBNB, -r.bnbBuyCost, n.sell || 0, 0, 0, 0, n.deposit, n.withdraw, n.internal, n.other === void 0 ? 0 : n.other, r.gas, r.closingBNB, null, null];
            } else vals = [r["opening" + asset], r["\u4E70\u5165" + asset] + r["bnbBuy" + asset], r["\u5356\u51FA" + asset], r["lpIn" + asset], r["lpOut" + asset], r["lpFee" + asset], r["deposit" + asset], r["withdraw" + asset], r["internalIn" + asset] - r["internalOut" + asset], r["other" + asset], 0, r["closing" + asset], r["openingLP" + asset], r["closingLP" + asset]];
            if (vals.some((v) => v !== null && !Number.isFinite(v))) throw new Error("\u6536\u652F\u6570\u636E\u7F3A\u5C11\u6570\u503C\uFF0C\u505C\u6B62\u53D1\u5E03");
            var line = start + newDetail.length + 8, formula = "=ROUND(O" + line + "-(SUM(D" + line + ":F" + line + ")-G" + line + "+SUM(H" + line + ":J" + line + ")-K" + line + "+SUM(L" + line + ":M" + line + ")-N" + line + ")," + (asset === "BNB" ? 10 : 8) + ")";
            newDetail.push([key2, link, asset].concat(vals, [formula]));
            newNotes.push(asset === "ESIM" ? "" : esimClassificationNote(r));
          });
        });
        var detail = oldDetail.slice(0, start).concat(newDetail, oldDetail.slice(start + oldCount)), last = detail.length + 7;
        detail = detail.map((r, i) => r.slice(0, 17).concat([esimDetailFormula(r[2], i + 8)]));
        var daily = Object.values(map).sort((a, b) => b.day.localeCompare(a.day)).map((r, i) => esimDailyRow(r.day, r.status, r.price, r.end, i + 13, last));
        return { daily, detail, replace: { start, oldCount, rows: newDetail, notes: newNotes } };
      }
      function esimRect(sid, r0, r1, c0, c1) {
        return { sheetId: sid, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 };
      }
      function esimIsOutlayTable(table) {
        var range = table.range || {};
        return range.startColumnIndex === 16 && [18, 20].includes(range.endColumnIndex);
      }
      function esimRequireOutlayModule(meta) {
        if (typeof esimOutlayRequests !== "function" && (meta.sheets || []).some((s) => s.properties.sheetId === ESIM_CFG.dailySheetId && (s.tables || []).some(esimIsOutlayTable))) throw new Error("\u603B\u652F\u51FA\u8868\u5DF2\u5B89\u88C5\uFF0C\u7EF4\u62A4\u65F6\u5FC5\u987B\u8F7D\u516542_Outlay\u6A21\u5757\uFF0C\u907F\u514D\u65E7\u516C\u5F0F\u8303\u56F4\u5931\u6548");
      }
      function esimCell(v) {
        if (v === null || v === void 0 || v === "") return {};
        return { userEnteredValue: typeof v === "number" ? { numberValue: v } : typeof v === "boolean" ? { boolValue: v } : v.startsWith("=") ? { formulaValue: v } : { stringValue: v } };
      }
      function esimWrite(sid, row, col, rows) {
        return { updateCells: { range: esimRect(sid, row, row + rows.length, col, col + rows[0].length), rows: rows.map((r) => ({ values: r.map(esimCell) })), fields: "userEnteredValue" } };
      }
      function esimFormat(sid, r0, r1, c0, c1, fmt) {
        return { repeatCell: { range: esimRect(sid, r0, r1, c0, c1), cell: { userEnteredFormat: fmt }, fields: Object.keys(fmt).map((k) => "userEnteredFormat." + k).join(",") } };
      }
      function esimDetailFormula(asset, row) {
        return "=ROUND(O" + row + "-(SUM(D" + row + ":F" + row + ")-G" + row + "+SUM(H" + row + ":J" + row + ")-K" + row + "+SUM(L" + row + ":M" + row + ")-N" + row + ")," + (asset === "BNB" ? 10 : 8) + ")";
      }
      function esimClassificationNote(row) {
        return (row.classificationNotes || []).map((n) => n.type + "\uFF1A" + n.reason + "\nUSDT " + (n.amountUnit === "raw-18-decimals" ? esimUnit(n.USDT) : n.USDT) + "\uFF1BBNB " + (n.amountUnit === "raw-18-decimals" ? esimUnit(n.BNB) : n.BNB) + "\nhttps://bscscan.com/tx/" + n.hash).join("\n\n");
      }
      function esimDailyHeaders() {
        return ["\u7EDF\u8BA1\u65E5\u671F", "\u4E70\u5165 ESIM", "\u4E70\u5165\u4ED8 U", "\u5356\u51FA ESIM", "\u5356\u51FA\u6536 U", "\u4EA4\u6613\u51C0\u5E01", "\u4EA4\u6613\u51C0 U", "\u671F\u672B\u5E01\n\u542BLP", "\u671F\u672B U\n\u542BLP", "\u6536\u76D8\u53C2\u8003\u4EF7", "ESIM+U\u4F30\u503C", "LP \u672C\u91D1\u8FDB\u51FA", "\u53EF\u590D\u5236\u65E5\u62A5", "\u7EDF\u8BA1\u72B6\u6001", "\u65E5\u671F\u952E", "\u5DF2\u7EDF\u8BA1\u81F3"];
      }
      function esimPriceNotesRequest(sid, daily, startRow) {
        var first = startRow === void 0 ? 12 : startRow;
        function stamp(serial) {
          return new Date(Math.round((serial - 25569) * 864e5)).toISOString().slice(0, 16).replace("T", " ");
        }
        var rows = daily.map((r) => {
          var at = stamp(r[15]), text;
          if (r[13] === "\u5DF2\u5B8C\u6210") text = "\u672C\u7EDF\u8BA1\u65E5\u6536\u76D8\u53C2\u8003\u4EF7\uFF1A\u5317\u4EAC\u65F6\u95F4 " + at + " \u524D\u6700\u540E\u533A\u5757\u7684\u5DF2\u6838\u9A8C ESIM/USDT \u53C2\u8003\u6C60\u4EF7\u683C\u3002\u7EDF\u8BA1\u65E5\u4ECE\u524D\u4E00\u592908:00\u81F3\u6B64\u65F6\u7ED3\u675F\u3002";
          else if (r[13] === "\u8FDB\u884C\u4E2D") text = "\u672C\u65E5\u5C1A\u672A\u6536\u76D8\uFF1B\u8FD9\u662F\u5317\u4EAC\u65F6\u95F4 " + at + " \u5DF2\u7EDF\u8BA1\u533A\u5757\u7684\u622A\u81F3\u53C2\u8003\u4EF7\uFF0C\u4E0D\u662F\u6536\u76D8\u4EF7\u3002";
          else text = "\u4EF7\u683C\u5F85\u6838\u9A8C\uFF1B\u622A\u81F3\u5317\u4EAC\u65F6\u95F4 " + at + "\uFF0C\u6682\u4E0D\u4F5C\u4E3A\u5DF2\u786E\u8BA4\u7684\u6536\u76D8\u4EF7\u3002";
          return { values: [{ note: text + "\n\u4EF7\u683C\u6765\u81EA\u8BE5\u7EDF\u8BA1\u65E5\u5DF2\u6838\u9A8C\u53C2\u8003\u6C60\u7684\u533A\u5757\u65F6\u70B9\u4EF7\uFF0C\u4E0D\u4EE3\u8868\u5168\u5E02\u573A\u7EDF\u4E00\u6210\u4EA4\u4EF7\uFF1B\u4F30\u503C\u4E0D\u662F\u5229\u6DA6\u3002" }] };
        });
        return { updateCells: { range: esimRect(sid, first, first + rows.length, 9, 10), rows, fields: "note" } };
      }
      function esimDailyExplanation() {
        var hour = String(ESIM_CFG.dailyStartHour).padStart(2, "0") + ":00";
        return "\u6BCF\u884C=\u5317\u4EAC\u65F6\u95F4" + hour + "\u5230\u6B21\u65E5" + hour + "\u3002\u6BCF\u5929" + hour + "\u540E\u81EA\u52A8\u8865\u6628\u5929\uFF1B\u70B9\u4E0A\u65B9\u9EC4\u8272\u65B9\u6846\u53EF\u624B\u52A8\u66F4\u65B0\u3002\n\u51C0\u5E01=\u4E70\u5165\u2212\u5356\u51FA\uFF1B\u51C0U=\u5356\u51FA\u6536U\u2212\u4E70\u5165\u4ED8U\u3002\u6B63\u6570\u589E\u52A0\uFF0C\u8D1F\u6570\u51CF\u5C11\uFF0C\u4E0D\u662F\u5229\u6DA6\u3002\n\u603B\u652F\u51FAU=\u4E70\u5E01\u4ED8U+\u52A0\u6C60\u6295\u5165U\uFF08\u64A4\u6C60\u53E6\u5217\u3001\u4E0D\u62B5\u6263\uFF09\u3002\u6700\u53F3\u201C\u5BF9\u5916\u8F6C\u51FA\u201D\u53EA\u7B97\u8F6C\u7ED9\u5730\u5740\u5E93\u5916\u7684\u94B1\u5305\uFF0C\u5E93\u5185\u4E92\u8F6C\u4E0D\u7B97\u3002\u671F\u672B\u542BLP\u672C\u91D1\uFF0C\u4F30\u503C\u4E0D\u662F\u5229\u6DA6\u3002";
      }
      function esimGlobalSummaryRequests(sid, dailyCount, detailCount) {
        var lastS = dailyCount + 12, lastD = detailCount + 7;
        var keys = "$O$13:$O$" + lastS, status = "$N$13:$N$" + lastS, eligible = "((" + status + '="\u5DF2\u5B8C\u6210")+(' + status + '="\u8FDB\u884C\u4E2D"))', validKeys = "FILTER(" + keys + "," + eligible + ")";
        var first = "MIN(" + validKeys + ")", latest = "MATCH(MAX(" + validKeys + ")," + keys + ",0)", count = "COUNTIF(" + status + ',"\u5DF2\u5B8C\u6210")+COUNTIF(' + status + ',"\u8FDB\u884C\u4E2D")';
        function opening(asset, col) {
          return "SUMIFS('\u5730\u5740\u660E\u7EC6'!$" + col + "$8:$" + col + "$" + Math.max(8, lastD) + ",'\u5730\u5740\u660E\u7EC6'!$A$8:$A$" + Math.max(8, lastD) + "," + first + ",'\u5730\u5740\u660E\u7EC6'!$C$8:$C$" + Math.max(8, lastD) + ',"' + asset + '")';
        }
        function total(col) {
          return "SUMIFS(" + col + "13:" + col + lastS + "," + status + ',"\u5DF2\u5B8C\u6210")+SUMIFS(' + col + "13:" + col + lastS + "," + status + ',"\u8FDB\u884C\u4E2D")';
        }
        var values = dailyCount ? [opening("ESIM", "D") + "+" + opening("ESIM", "P"), opening("USDT", "D") + "+" + opening("USDT", "P"), "INDEX(H13:H" + lastS + "," + latest + ")", "INDEX(I13:I" + lastS + "," + latest + ")", total("F"), total("G")].map((formula) => "=IF(" + count + "=0,IF(COUNTIF(" + status + ',"\u5F85\u6838\u9A8C")>0,"\u5F85\u6838\u9A8C","\u65E0\u6570\u636E"),' + formula + ")") : Array(6).fill("\u65E0\u6570\u636E");
        return values.map((x, i) => esimWrite(sid, 3, i * 2, [[x]]));
      }
      function esimPeriodRequests(sid, lastRow, options) {
        options = options || {};
        var last = Math.max(13, lastRow), keys = "$O$13:$O$" + last, status = "$N$13:$N$" + last, ends = "$P$13:$P$" + last;
        var eligible = "(" + keys + '<>"")*((' + status + '="\u5DF2\u5B8C\u6210")+$F$7*(' + status + '="\u8FDB\u884C\u4E2D"))', selected = eligible + "*(" + keys + ">=$P$7)*(" + keys + "<=$O$8)";
        var validation = '=IF(NOT(OR($B$7="\u5168\u90E8",$B$7="\u8FD1X\u5929",$B$7="\u65E5\u671F\u8303\u56F4")),"\u8BF7\u9009\u62E9\u6709\u6548\u7EDF\u8BA1\u5468\u671F",IF(NOT(ISLOGICAL($F$7)),"\u5305\u542B\u8FDB\u884C\u4E2D\u5FC5\u987B\u52FE\u9009\u6216\u53D6\u6D88\u52FE\u9009",IF($B$7="\u8FD1X\u5929",IF(IFERROR(AND(ISNUMBER($D$7),$D$7>=1,$D$7=INT($D$7)),FALSE),"","\u8FD1X\u5929\u8BF7\u8F93\u5165\u6B63\u6574\u6570"),IF($B$7="\u65E5\u671F\u8303\u56F4",IF(IFERROR(AND(ISNUMBER($H$7),ISNUMBER($J$7),$H$7>0,$J$7>0,$H$7=INT($H$7),$J$7=INT($J$7),$H$7<=$J$7,$J$7<=DATE(9999,12,31)),FALSE),"","\u65E5\u671F\u8303\u56F4\u65E0\u6548\uFF1A\u8BF7\u8F93\u5165\u6709\u6548\u65E5\u671F\uFF0C\u4E14\u5F00\u59CB\u65E5\u671F\u4E0D\u665A\u4E8E\u7ED3\u675F\u65E5\u671F"),""))))';
        var lower = '=IF(OR($O$7<>"",$P$9=0),"",IF($B$7="\u65E5\u671F\u8303\u56F4",$H$7,IF($B$7="\u8FD1X\u5929",LARGE(FILTER(' + keys + "," + eligible + "),MIN($D$7,$P$9)),MIN(FILTER(" + keys + "," + eligible + ")))))";
        var upper = '=IF(OR($O$7<>"",$P$9=0),"",IF($B$7="\u65E5\u671F\u8303\u56F4",$J$7,MAX(FILTER(' + keys + "," + eligible + "))))";
        var criteria = keys + ',">="&$P$7,' + keys + ',"<="&$O$8,' + status;
        var complete = '=IF(OR($O$7<>"",$P$9=0),0,COUNTIFS(' + criteria + ',"\u5DF2\u5B8C\u6210"))';
        var ongoing = '=IF(OR($O$7<>"",$P$9=0,NOT($F$7)),0,COUNTIFS(' + criteria + ',"\u8FDB\u884C\u4E2D"))';
        var available = "=COUNTIFS(" + keys + ',">0",' + status + ',"\u5DF2\u5B8C\u6210")+IF($F$7,COUNTIFS(' + keys + ',">0",' + status + ',"\u8FDB\u884C\u4E2D"),0)';
        var req = [esimWrite(sid, 6, 14, [[validation, lower], [upper, complete], [ongoing, available]])];
        ["B", "C", "D", "E", "F", "G"].forEach((col, i) => {
          var sumRange = "$" + col + "$13:$" + col + "$" + last;
          req.push(esimWrite(sid, 8, i * 2, [['=IF($O$7<>"","\u8F93\u5165\u65E0\u6548",IF($P$8+$O$9=0,"\u65E0\u5339\u914D",SUMIFS(' + sumRange + "," + criteria + ',"\u5DF2\u5B8C\u6210")+IF($F$7,SUMIFS(' + sumRange + "," + criteria + ',"\u8FDB\u884C\u4E2D"),0)))']]));
        });
        req.push(esimWrite(sid, 8, 12, [['=IF($O$7<>"","\u8F93\u5165\u65E0\u6548",$P$8+$O$9)']]));
        req.push(esimWrite(sid, 9, 0, [['=IF($O$7<>"",$O$7,IF($P$8+$O$9=0,"\u65E0\u5339\u914D\u65E5\u62A5\uFF0C\u8BF7\u8C03\u6574\u65E5\u671F\u6216\u5305\u542B\u8FDB\u884C\u4E2D\u9009\u9879","\u5B9E\u9645\u9009\u4E2D\uFF1A"&TEXT(MIN(FILTER(' + keys + "," + selected + "))+" + ESIM_CFG.dailyStartHour + '/24,"yyyy-mm-dd hh:mm")&" \u81F3 "&TEXT(MAX(FILTER(' + ends + "," + selected + ')),"yyyy-mm-dd hh:mm")&"\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09\uFF1B\u5DF2\u5B8C\u6210 "&$P$8&" \u5929\uFF0C\u8FDB\u884C\u4E2D "&$O$9&" \u5929"))']]));
        if (options.initializeSelectors) {
          [["\u7EDF\u8BA1\u5468\u671F", "\u5168\u90E8", "\u8FD1X\u5929", 3, "\u5305\u542B\u8FDB\u884C\u4E2D", true, "\u5F00\u59CB\u65E5\u671F", options.startDate || "", "\u7ED3\u675F\u65E5\u671F", options.endDate || ""]].forEach((r) => req.push(esimWrite(sid, 6, 0, [r])));
        }
        return req;
      }
      function esimDetailBorders(did, detail) {
        if (!detail.length) return [];
        var last = detail.length + 7, light = { red: 0.84, green: 0.88, blue: 0.92 }, line = { style: "SOLID_MEDIUM", color: { red: 0.4, green: 0.5, blue: 0.63 } };
        var req = [{ updateBorders: { range: esimRect(did, 7, last, 0, 18), top: { style: "NONE" }, bottom: { style: "NONE" }, innerHorizontal: { style: "SOLID", color: light } } }];
        detail.forEach((r, i) => {
          if (i === 0 || r[0] !== detail[i - 1][0]) req.push({ updateBorders: { range: esimRect(did, i + 7, i + 8, 0, 18), top: line } });
        });
        req.push({ updateBorders: { range: esimRect(did, last - 1, last, 0, 18), bottom: line } });
        return req;
      }
      function esimLayoutRequests(meta, daily, detail, options) {
        options = options || {};
        var sid = ESIM_CFG.dailySheetId, did = ESIM_CFG.detailSheetId, lastS = Math.max(13, daily.length + 12), lastD = Math.max(8, detail.length + 7), heads = esimDailyHeaders();
        esimRequireOutlayModule(meta);
        var navy = { red: 0.09, green: 0.17, blue: 0.29 }, ink = { red: 0.12, green: 0.16, blue: 0.21 }, blue = { red: 0.12, green: 0.35, blue: 0.72 }, white = { red: 1, green: 1, blue: 1 }, light = { red: 0.92, green: 0.95, blue: 0.98 }, yellow = { red: 1, green: 0.95, blue: 0.8 }, num = '#,##0.00;[Red]-#,##0.00;"\u2013"';
        var req = [];
        (meta.sheets || []).forEach((s) => {
          var isDaily = s.properties.sheetId === sid;
          if (!isDaily && s.properties.sheetId !== did) return;
          var id = s.properties.sheetId;
          (s.tables || []).forEach((t) => {
            var outlay = isDaily && esimIsOutlayTable(t), end = outlay ? t.range.endColumnIndex : isDaily ? 14 : 18, table = { tableId: t.tableId, range: esimRect(id, isDaily ? 11 : 6, isDaily ? lastS : lastD, outlay ? 16 : 0, end) };
            if (isDaily) table.columnProperties = (outlay ? ["\u603B\u652F\u51FA U\n\u4E70\u5165+LP\u5360\u7528", "LP \u64A4\u51FA U", "\u5BF9\u5916\u8F6C\u51FA USDT", "\u5BF9\u5916\u8F6C\u51FA ESIM"].slice(0, end - 16) : heads.slice(0, 14)).map((h, i2) => ({ columnIndex: i2, columnName: h, columnType: "COLUMN_TYPE_UNSPECIFIED" }));
            req.push({ updateTable: { table, fields: isDaily ? "range,columnProperties" : "range" } });
          });
          for (var i = (s.conditionalFormats || []).length - 1; i >= 0; i--) req.push({ deleteConditionalFormatRule: { sheetId: id, index: i } });
        });
        req.push({ unmergeCells: { range: esimRect(sid, 6, 10, 0, 14) } });
        req.push({ unmergeCells: { range: esimRect(sid, 4, 5, 0, 14) } });
        req.push({ mergeCells: { range: esimRect(sid, 4, 5, 0, 14), mergeType: "MERGE_ALL" } });
        req.push(esimWrite(sid, 4, 0, [[esimDailyExplanation()]]));
        req.push(esimFormat(sid, 4, 5, 0, 14, { wrapStrategy: "WRAP" }));
        req.push(esimWrite(sid, 11, 0, [heads]));
        req.push(esimWrite(did, 6, 12, [["\u5176\u4ED6\u5151\u6362/\u6536\u652F \xB1"]]));
        req.push(esimFormat(sid, 6, lastS, 0, 16, { backgroundColor: white, textFormat: { fontFamily: "Arial", fontSize: 10, foregroundColor: ink }, verticalAlignment: "MIDDLE" }));
        req.push(esimFormat(sid, 11, 12, 0, 14, { backgroundColor: navy, textFormat: { bold: true, foregroundColor: white }, wrapStrategy: "WRAP", horizontalAlignment: "CENTER" }));
        req.push(esimFormat(sid, 12, lastS, 1, 11, { numberFormat: { type: "NUMBER", pattern: num } }));
        req.push(esimFormat(sid, 12, lastS, 9, 10, { numberFormat: { type: "NUMBER", pattern: "0.000000" } }));
        req.push(esimFormat(sid, 12, lastS, 5, 7, { numberFormat: { type: "NUMBER", pattern: '+#,##0.00;[Red]-#,##0.00;"\u2013"' } }));
        [1, 3, 5, 7].forEach((c) => req.push(esimFormat(sid, 12, lastS, c, c + 1, { textFormat: { foregroundColor: blue } })));
        req.push(esimFormat(sid, 12, lastS, 11, 14, { wrapStrategy: "WRAP" }));
        req.push(esimFormat(sid, 6, 7, 0, 14, { backgroundColor: light, textFormat: { bold: true, foregroundColor: ink }, wrapStrategy: "WRAP" }));
        [1, 3, 5, 7, 9].forEach((c) => req.push(esimFormat(sid, 6, 7, c, c + 1, { backgroundColor: yellow })));
        req.push(esimFormat(sid, 6, 7, 7, 10, { numberFormat: { type: "DATE", pattern: "yyyy-mm-dd" } }));
        req.push(esimWrite(sid, 6, 10, [["\u65E5\u671F\u6309\u6BCF\u592908:00\u5F00\u59CB\u7B97\uFF1B\u8FD1X\u5929=\u6700\u8FD1X\u5F20\u65E5\u62A5\u3002\u4E0D\u52FE\u9009\u201C\u5305\u542B\u8FDB\u884C\u4E2D\u201D\uFF0C\u53EA\u7EDF\u8BA1\u5DF2\u5B8C\u6210\u7684\u65E5\u62A5\uFF1B\u5F85\u6838\u9A8C\u4E0D\u8BA1\u5165\u533A\u95F4\u7EDF\u8BA1\u3002"]]));
        req.push({ mergeCells: { range: esimRect(sid, 6, 7, 10, 14), mergeType: "MERGE_ALL" } });
        ["\u5468\u671F\u4E70\u5165 ESIM", "\u5468\u671F\u4E70\u5165\u4ED8 U", "\u5468\u671F\u5356\u51FA ESIM", "\u5468\u671F\u5356\u51FA\u6536 U", "\u5468\u671F\u4EA4\u6613\u51C0\u5E01", "\u5468\u671F\u4EA4\u6613\u51C0 U", "\u7EDF\u8BA1\u5929\u6570"].forEach((label, i) => {
          [7, 8].forEach((r) => req.push({ mergeCells: { range: esimRect(sid, r, r + 1, i * 2, i * 2 + 2), mergeType: "MERGE_ALL" } }));
          req.push(esimWrite(sid, 7, i * 2, [[label]]));
          req.push(esimFormat(sid, 7, 8, i * 2, i * 2 + 2, { backgroundColor: light, textFormat: { bold: true, foregroundColor: ink } }));
          req.push(esimFormat(sid, 8, 9, i * 2, i * 2 + 2, { numberFormat: { type: "NUMBER", pattern: i === 6 ? "0" : num }, textFormat: { bold: true, fontSize: 14, foregroundColor: i < 6 && i % 2 === 0 ? blue : ink } }));
        });
        req.push({ mergeCells: { range: esimRect(sid, 9, 10, 0, 14), mergeType: "MERGE_ALL" } });
        req.push(esimFormat(sid, 9, 10, 0, 14, { wrapStrategy: "WRAP", textFormat: { fontSize: 10, foregroundColor: ink } }));
        req.push({ setDataValidation: { range: esimRect(sid, 6, 7, 1, 2), rule: { condition: { type: "ONE_OF_LIST", values: ["\u5168\u90E8", "\u8FD1X\u5929", "\u65E5\u671F\u8303\u56F4"].map((x) => ({ userEnteredValue: x })) }, strict: true, showCustomUi: true, inputMessage: "\u9009\u62E9\u7EDF\u8BA1\u5468\u671F\uFF0C\u533A\u95F4\u6C47\u603B\u4F1A\u7ACB\u5373\u91CD\u7B97\u3002" } } });
        req.push({ setDataValidation: { range: esimRect(sid, 6, 7, 3, 4), rule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=AND(ISNUMBER(D7),D7>=1,D7=INT(D7))" }] }, strict: true, inputMessage: "\u8BF7\u8F93\u5165\u6B63\u6574\u6570\uFF0C\u4F8B\u59823\u3002" } } });
        req.push({ setDataValidation: { range: esimRect(sid, 6, 7, 5, 6), rule: { condition: { type: "BOOLEAN" }, strict: true, showCustomUi: true } } });
        [7, 9].forEach((c) => req.push({ setDataValidation: { range: esimRect(sid, 6, 7, c, c + 1), rule: { condition: { type: "DATE_IS_VALID" }, strict: true, showCustomUi: true, inputMessage: "\u6309\u7EDF\u8BA1\u65E5\u5F00\u59CB\u65E5\u671F\u9009\u62E9\uFF0C\u5305\u542B\u9996\u5C3E\u4E24\u5929\u3002" } } }));
        req.push({ updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: 12, frozenColumnCount: 0, hideGridlines: true } }, fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount,gridProperties.hideGridlines" } });
        function size2(dim, start, end, pixels) {
          req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: dim, startIndex: start, endIndex: end }, properties: { pixelSize: pixels }, fields: "pixelSize" } });
        }
        size2("ROWS", 4, 5, 64);
        size2("ROWS", 5, 6, 12);
        size2("ROWS", 6, 7, 44);
        size2("ROWS", 7, 8, 26);
        size2("ROWS", 8, 9, 34);
        size2("ROWS", 9, 10, 34);
        size2("ROWS", 10, 11, 28);
        size2("ROWS", 11, 12, 42);
        size2("ROWS", 12, lastS, 52);
        size2("COLUMNS", 0, 1, 136);
        size2("COLUMNS", 1, 11, 112);
        size2("COLUMNS", 11, 12, 330);
        size2("COLUMNS", 12, 13, 720);
        size2("COLUMNS", 13, 14, 154);
        req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "COLUMNS", startIndex: 14, endIndex: 16 }, properties: { hiddenByUser: true }, fields: "hiddenByUser" } });
        function conditional(range, type, value, format) {
          req.push({ addConditionalFormatRule: { index: 0, rule: { ranges: [range], booleanRule: { condition: { type, values: [{ userEnteredValue: value }] }, format } } } });
        }
        conditional(esimRect(sid, 12, lastS, 13, 14), "TEXT_EQ", "\u8FDB\u884C\u4E2D", { backgroundColor: yellow });
        conditional(esimRect(sid, 12, lastS, 13, 14), "TEXT_EQ", "\u5F85\u6838\u9A8C", { backgroundColor: yellow, textFormat: { bold: true } });
        conditional(esimRect(sid, 9, 10, 0, 14), "CUSTOM_FORMULA", '=$O$7<>""', { textFormat: { foregroundColor: { red: 0.7, green: 0.15, blue: 0.12 }, bold: true } });
        conditional(esimRect(did, 7, lastD, 2, 18), "CUSTOM_FORMULA", '=$C8="ESIM"', { textFormat: { foregroundColor: blue } });
        conditional(esimRect(did, 7, lastD, 17, 18), "NUMBER_NOT_EQ", "0", { backgroundColor: { red: 1, green: 0.85, blue: 0.84 }, textFormat: { foregroundColor: { red: 0.7, green: 0.15, blue: 0.12 }, bold: true } });
        if (daily.length) req.push(esimPriceNotesRequest(sid, daily));
        if (typeof esimOutlayRequests === "function") req = req.concat(esimOutlayRequests(meta, daily.length, detail.length, { ensureRows: false }));
        return req.concat(esimPeriodRequests(sid, daily.length + 12, { initializeSelectors: !!options.initializeSelectors, startDate: daily.length ? Math.min.apply(null, daily.map((r) => r[14])) : "", endDate: daily.length ? Math.max.apply(null, daily.map((r) => r[14])) : "" }), esimGlobalSummaryRequests(sid, daily.length, detail.length), esimDetailBorders(did, detail));
      }
      function esimBook() {
        var ss = SpreadsheetApp.openById(ESIM_CFG.spreadsheetId), count = ss.getSheets().length, ext = ss.getSheetByName("\u5BF9\u5916\u8F6C\u8D26");
        if (![2, 3, 4].includes(count) || !ss.getSheetByName("\u6BCF\u65E5\u6536\u652F") || !ss.getSheetByName("\u5730\u5740\u660E\u7EC6") || count >= 3 && !ss.getSheetByName("\u5730\u5740\u5E93") || count === 4 && (!ext || typeof esimSyncExternalTransfers !== "function" || ext.getSheetId() !== ESIM_EXTERNAL_SHEET_ID)) throw new Error("\u5DE5\u4F5C\u8868\u7ED3\u6784\u88AB\u6539\u52A8\uFF0C\u505C\u6B62\u81EA\u52A8\u8986\u76D6");
        return ss;
      }
      function esimReadRows(name, columns) {
        var sheet = esimBook().getSheetByName(name), last = sheet.getLastRow(), first = name === "\u6BCF\u65E5\u6536\u652F" ? 13 : 8;
        if (last < first) return [];
        return (Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'" + name + "'!A" + first + ":" + columns + last, { valueRenderOption: "FORMULA", dateTimeRenderOption: "SERIAL_NUMBER" }).values || []).filter((r) => r.length);
      }
      function esimCompletedDays() {
        return esimReadRows("\u6BCF\u65E5\u6536\u652F", "P").filter((r) => r[13] === "\u5DF2\u5B8C\u6210").map((r) => esimDayFromSerial(r[14]));
      }
      function esimSetStatus(text, bad) {
        var sheet = esimBook().getSheetByName("\u6BCF\u65E5\u6536\u652F");
        sheet.getRange("C2").setValue(text).setFontColor(bad ? "#B3261E" : "#17633D");
        SpreadsheetApp.flush();
      }
      function esimSetupSheet() {
        var ss = esimBook(), s = ss.getSheetByName("\u6BCF\u65E5\u6536\u652F"), d = ss.getSheetByName("\u5730\u5740\u660E\u7EC6"), hour = String(ESIM_CFG.dailyStartHour).padStart(2, "0") + ":00";
        s.getRange("A2:L2").breakApart();
        s.getRange("A2:L2").clearContent();
        s.getRange("C2:L2").merge();
        s.getRange("A2").setValue("\u624B\u52A8\u66F4\u65B0 \u2192").setFontWeight("bold");
        s.getRange("B2").insertCheckboxes().setValue(false).setBackground("#FFF2CC").setNote("\u70B9\u4E00\u6B21\u65B9\u6846\u5373\u53EF\u3002\u91CD\u65B0\u91C7\u96C6\u6700\u8FD1\u4E00\u4E2A\u5B8C\u6574\u7EDF\u8BA1\u65E5\uFF0C\u5E76\u8865\u9F50\u7F3A\u5931\u65E5\u671F\uFF1B\u4E0D\u7528\u91CD\u590D\u70B9\u51FB\u3002");
        s.getRange("C2:L2").setWrap(true);
        s.setRowHeight(2, 42);
        s.getRange("A5").setValue(esimDailyExplanation()).setWrap(true);
        s.setRowHeight(5, 64);
        s.getRange("A1").setNote("\u4ECE" + ESIM_CFG.startDay + "\u8D77\u7EDF\u8BA1\u201C\u5730\u5740\u5E93\u201D\u4E2D\u7684\u94B1\u5305\u3002\u53EA\u67E5\u94FE\u4E0A\uFF0C\u4E0D\u64CD\u4F5C\u94B1\u5305\u3002\u65B0\u589E\u5730\u5740\u4F1A\u4ECE\u7EDF\u8BA1\u8D77\u70B9\u8865\u7B97\u5386\u53F2\uFF0C\u672A\u8865\u5B8C\u65F6\u6807\u660E\u5F85\u6838\u9A8C\u3002" + hour + "\u662F\u5F00\u59CB\u66F4\u65B0\u7684\u65F6\u95F4\uFF0C\u5206\u6279\u91C7\u96C6\u540E\u624D\u663E\u793A\u5B8C\u6210\uFF1BGoogle\u53EF\u80FD\u6709\u51E0\u5206\u949F\u8C03\u5EA6\u5EF6\u8FDF\u3002");
        var notes = ["\u6BCF\u884C\u4E00\u5929\uFF0C\u4F8B\u5982261024-1025\u8868\u793A10\u670824\u65E5" + hour + "\u523025\u65E5" + hour + "\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09\u3002", "\u7528U\u6216BNB\u4E70\u5230\u7684ESIM\u5E01\u91CF\u3002", "\u4E70ESIM\u5B9E\u9645\u82B1\u6389\u7684USDT\uFF1B\u7528BNB\u4E70\u7684\u53E6\u5916\u5199\u5728\u65E5\u62A5\u91CC\u3002", "\u5B9E\u9645\u5356\u51FA\u7684ESIM\u5E01\u91CF\u3002", "\u5356ESIM\u5B9E\u9645\u6536\u5230\u7684USDT\u3002", "\u4E70\u5165\u5E01\u51CF\u53BB\u5356\u51FA\u5E01\u3002\u6B63\u6570\u662F\u51C0\u4E70\u5165\uFF0C\u8D1F\u6570\u662F\u51C0\u5356\u51FA\uFF1B\u4E0D\u662F\u5229\u6DA6\u3002", "\u5356\u51FA\u6536\u5230\u7684U\u51CF\u53BB\u4E70\u5165\u82B1\u6389\u7684U\u3002\u6B63\u6570\u662F\u51C0\u6536U\uFF0C\u8D1F\u6570\u662F\u51C0\u82B1U\uFF1B\u4E0D\u542B\u8F6C\u8D26\u548CLP\u3002", "\u94B1\u5305\u91CC\u7684\u5E01\uFF0C\u52A0\u4E0A\u4ECD\u5728LP\u91CC\u7684\u672C\u91D1\u5E01\u91CF\u3002", "\u94B1\u5305\u91CC\u7684U\uFF0C\u52A0\u4E0A\u4ECD\u5728LP\u91CC\u7684\u672C\u91D1U\u3002", "\u7EDF\u8BA1\u7ED3\u675F\u533A\u5757\u7684\u94FE\u4E0A\u53C2\u8003\u4EF7\uFF0C\u4E0D\u662F\u4FDD\u8BC1\u80FD\u6210\u4EA4\u7684\u4EF7\u683C\u3002", "\u671F\u672B\u5E01\u4E58\u53C2\u8003\u4EF7\uFF0C\u518D\u52A0\u671F\u672BU\uFF1B\u4E0D\u542BBNB\u548C\u672A\u9886\u53D6LP\u8D39\uFF0C\u4E0D\u662F\u5229\u6DA6\u3002", "\u52A0\u6C60=\u6295\u5165LP\u7684\u672C\u91D1\uFF1B\u64A4\u6C60=\u53D6\u56DE\u7684\u672C\u91D1\uFF1BLP\u8D39\u7528\u5355\u5217\u5728\u5730\u5740\u660E\u7EC6\u3002", "\u7531\u516C\u5F0F\u81EA\u52A8\u751F\u6210\uFF0C\u53EF\u4EE5\u76F4\u63A5\u590D\u5236\u53D1\u9001\uFF1B\u4E0D\u8981\u624B\u52A8\u6539\u8FD9\u5217\u3002", "\u5DF2\u5B8C\u6210\uFF1A\u5B8C\u6574\u7EDF\u8BA1\u65E5\u5DF2\u91C7\u96C6\u6838\u9A8C\uFF1B\u8FDB\u884C\u4E2D\uFF1A\u5C1A\u672A\u7ED3\u7B97\u7684\u5FEB\u7167\uFF0C\u4E0D\u80FD\u5F53\u6574\u5929\uFF1B\u5F85\u6838\u9A8C\uFF1A\u5199\u5165\u540E\u5C1A\u672A\u901A\u8FC7\u56DE\u8BFB\uFF0C\u4E0D\u8BA1\u5165\u533A\u95F4\u7EDF\u8BA1\uFF0C\u91CD\u65B0\u66F4\u65B0\u53EF\u6062\u590D\u3002"];
        notes[9] = "\u5DF2\u5B8C\u6210\u65E5\u62A5\uFF1A\u53D6\u7EDF\u8BA1\u7ED3\u675F\u65E5\u5317\u4EAC\u65F6\u95F408:00\u524D\u6700\u540E\u533A\u5757\u7684\u5DF2\u6838\u9A8CESIM/USDT\u53C2\u8003\u6C60\u4EF7\u683C\uFF0C\u4F5C\u4E3A\u8BE5\u7EDF\u8BA1\u65E5\u6536\u76D8\u53C2\u8003\u4EF7\u3002\u8FDB\u884C\u4E2D\u65E5\u62A5\uFF1A\u53EA\u663E\u793A\u622A\u81F3\u5DF2\u91C7\u96C6\u533A\u5757\u7684\u53C2\u8003\u4EF7\uFF0C\u4E0D\u662F\u6536\u76D8\u4EF7\u3002\u5404\u884C\u5B9E\u9645\u65F6\u70B9\u89C1\u8BE5\u5355\u5143\u683C\u5907\u6CE8\uFF1B\u4E0D\u662F\u5168\u5E02\u573A\u552F\u4E00\u6210\u4EA4\u4EF7\u3002";
        s.getRange(12, 1, 1, 14).setNotes([notes]);
        d.getRange("A2").setValue("\u5148\u7B5B\u9009\u65E5\u671F\uFF0C\u518D\u770B\u5730\u5740\u3002\u6BCF\u4E2A\u5730\u5740\u5206 ESIM\u3001USDT\u3001BNB \u4E09\u884C\uFF1B\u5168\u662F0\u4E14\u6CA1\u6709\u64CD\u4F5C\u7684\u5730\u5740\u65E5\u4E0D\u663E\u793A\u3002\u70B9\u51FB\u5730\u5740\u53EF\u67E5\u770B\u94FE\u4E0A\u8BB0\u5F55\u3002");
        d.getRange("A4").setValue("\u770B\u8FD9\u4E00\u884C\uFF1A\u671F\u521D=\u5F00\u59CB\u65F6\u94B1\u5305\u6709\u591A\u5C11\uFF1B\u671F\u672B=\u7ED3\u675F\u65F6\u94B1\u5305\u6709\u591A\u5C11\u3002\u4E70\u5356\u3001\u52A0\u6C60/\u64A4\u6C60\u3001\u8F6C\u8D26\u3001\u624B\u7EED\u8D39\u5206\u522B\u8BB0\uFF0C\u6700\u540E\u6838\u5BF9\u5DEE\u989D\u5FC5\u987B\u4E3A0\u3002");
        d.getRange("A5").setValue("\u7EC4\u5185\u51C0\u8F6C\u8D26=\u5730\u5740\u5E93\u5185\u7684\u94B1\u5305\u4E92\u8F6C\uFF0C\u4E0D\u7B97\u65B0\u589E\u6536\u5165\u3002\u5176\u4ED6\u5151\u6362/\u6536\u652F\u542BBNB\u2194USDT\u5151\u6362\u53CA\u5F85\u6838\u5B9E\u6536\u652F\uFF0C\u4E0D\u8BA1\u5916\u90E8\u5165\u91D1\uFF1B\u9010\u7B14\u8BC1\u636E\u89C1M\u5217\u5907\u6CE8\u3002LP\u8D39=\u5DF2\u7ED3\u7B97\u8D39\u7528\uFF1BGas=BNB\u624B\u7EED\u8D39\u3002");
        d.getRange("M7").setValue("\u5176\u4ED6\u5151\u6362/\u6536\u652F \xB1").setNote("\u5E26\u7B26\u53F7\u5E01\u91CF\uFF1A\u6B63\u4E3A\u6536\u5230\uFF0C\u8D1F\u4E3A\u4ED8\u51FA\u3002\u975EESIM\u5151\u6362\u53CA\u5F85\u6838\u5B9E\u6536\u652F\u4E0D\u8BA1\u5916\u90E8\u8F6C\u5165/\u8F6C\u51FA\uFF1BUSDT/BNB\u884C\u5907\u6CE8\u4FDD\u7559\u4EA4\u6613\u54C8\u5E0C\u3001\u5206\u7C7B\u53CA\u8BC1\u636E\u539F\u56E0\u3002");
        d.getRange("R7").setNote("\u540E\u53F0\u5148\u6309\u94FE\u4E0A\u539F\u59CB\u6574\u6570\u5BF9\u8D26\uFF1B\u4E0D\u5E73\u5219\u4E0D\u53D1\u5E03\u3002\u8868\u91CC\u518D\u6B21\u7528\u663E\u793A\u6570\u503C\u6838\u5BF9\uFF0C0\u8868\u793A\u4F59\u989D\u5BF9\u4E0A\uFF0C\u4E0D\u7B49\u4E8E\u76C8\u5229\u3002");
        d.getRange("A1").setNote("BNB\u8865\u67E5\u4EE5\u5DF2\u53D1\u73B0\u7684\u4EA4\u6613\u548C\u4F59\u989D\u5DEE\u989D\u4E3A\u7EBF\u7D22\uFF1B\u4F59\u989D\u5BF9\u5E73\u4E0D\u4EE3\u8868\u7A77\u5C3D\u6240\u6709\u76F8\u4E92\u62B5\u9500\u3001\u51C0\u989D\u4E3A0\u7684\u672A\u77E5\u7EAFBNB\u5F80\u8FD4\u3002\u539F\u59CB\u8BC1\u636E\u4FDD\u5B58\u5728\u72EC\u7ACB\u91C7\u96C6\u7F13\u5B58\u4E2D\u3002");
        d.setRowHeight(4, 40);
        d.setRowHeight(5, 40);
        SpreadsheetApp.flush();
      }
      function esimPublishJob(job) {
        if (job.cohort && typeof esimCheckCurrentRegistry === "function") esimCheckCurrentRegistry(job);
        esimAssertPublishable(job.result);
        esimFreshBoundaryCheck(job);
        var ss = esimBook(), daily = esimReadRows("\u6BCF\u65E5\u6536\u652F", "P"), detail = esimReadRows("\u5730\u5740\u660E\u7EC6", "R"), view = esimBuildView(daily, detail, job);
        var meta = Sheets.Spreadsheets.get(ESIM_CFG.spreadsheetId, { fields: "sheets(properties,tables,conditionalFormats)" }), sid = ESIM_CFG.dailySheetId, did = ESIM_CFG.detailSheetId, req = [], rep = view.replace, at = rep.start + 7, diff = rep.rows.length - rep.oldCount;
        esimRequireOutlayModule(meta);
        var summaryIndex = view.daily.findIndex((r) => r[14] === esimSerial(job.day)), summaryRow = summaryIndex + 13, pendingDaily = view.daily.map((r) => r.slice());
        pendingDaily[summaryIndex][13] = "\u5F85\u6838\u9A8C";
        function statusRequests(status) {
          var priceRow = view.daily[summaryIndex].slice();
          priceRow[13] = status;
          return [esimWrite(sid, summaryRow - 1, 13, [[status]]), esimFormat(sid, summaryRow - 1, summaryRow, 13, 14, { backgroundColor: status === "\u5F85\u6838\u9A8C" ? { red: 1, green: 0.95, blue: 0.8 } : { red: 1, green: 1, blue: 1 } }), esimPriceNotesRequest(sid, [priceRow], summaryRow - 1)];
        }
        if (!job.beforePublish) job.beforePublish = { daily, detail };
        esimSaveJob(job);
        if (diff > 0) req.push({ insertDimension: { range: { sheetId: did, dimension: "ROWS", startIndex: at + rep.oldCount, endIndex: at + rep.oldCount + diff }, inheritFromBefore: true } });
        if (diff < 0) req.push({ deleteDimension: { range: { sheetId: did, dimension: "ROWS", startIndex: at + rep.rows.length, endIndex: at + rep.oldCount } } });
        if (rep.rows.length) {
          if (detail.length) {
            var template = 7 + (diff > 0 && at + rep.oldCount === 7 ? diff : 0);
            req.push({ copyPaste: { source: esimRect(did, template, template + 3, 0, 18), destination: esimRect(did, at, at + rep.rows.length, 0, 18), pasteType: "PASTE_FORMAT" } });
          } else {
            req.push(esimFormat(did, at, at + rep.rows.length, 0, 18, { backgroundColor: { red: 1, green: 1, blue: 1 }, textFormat: { fontFamily: "Arial", fontSize: 10, foregroundColor: { red: 0.12, green: 0.16, blue: 0.21 } }, verticalAlignment: "MIDDLE" }));
            req.push(esimFormat(did, at, at + rep.rows.length, 0, 1, { numberFormat: { type: "DATE", pattern: "yy-mm-dd" } }));
            req.push(esimFormat(did, at, at + rep.rows.length, 3, 18, { numberFormat: { type: "NUMBER", pattern: '#,##0.00;[Red]-#,##0.00;"\u2013"' } }));
            rep.rows.forEach((r, i) => {
              if (r[2] === "BNB") req.push(esimFormat(did, at + i, at + i + 1, 3, 18, { numberFormat: { type: "NUMBER", pattern: '#,##0.00000000;[Red]-#,##0.00000000;"\u2013"' } }));
            });
          }
          req.push(esimWrite(did, at, 0, rep.rows));
          req.push({ updateCells: { range: esimRect(did, at, at + rep.rows.length, 12, 13), rows: rep.notes.map((note) => ({ values: [{ note }] })), fields: "note" } });
          req.push({ updateDimensionProperties: { range: { sheetId: did, dimension: "ROWS", startIndex: at, endIndex: at + rep.rows.length }, properties: { pixelSize: 26 }, fields: "pixelSize" } });
        }
        var sr = meta.sheets.find((s) => s.properties.sheetId === sid).properties.gridProperties.rowCount;
        if (view.daily.length + 12 > sr) req.push({ appendDimension: { sheetId: sid, dimension: "ROWS", length: view.daily.length + 12 - sr + 20 } });
        req.push({ copyPaste: { source: esimRect(sid, 12, 13, 0, 16), destination: esimRect(sid, 12, 12 + view.daily.length, 0, 16), pasteType: "PASTE_FORMAT" } });
        req.push(esimWrite(sid, 12, 0, pendingDaily), esimPriceNotesRequest(sid, pendingDaily));
        req = req.concat(statusRequests("\u5F85\u6838\u9A8C"));
        var lastD = view.detail.length + 7, lastS = view.daily.length + 12;
        if (view.detail.length) req.push(esimWrite(did, 7, 17, view.detail.map((r) => [r[17]])));
        req = req.concat(esimGlobalSummaryRequests(sid, view.daily.length, view.detail.length), esimPeriodRequests(sid, lastS, { initializeSelectors: false }), esimDetailBorders(did, view.detail));
        if (typeof esimOutlayRequests === "function") req = req.concat(esimOutlayRequests(meta, view.daily.length, view.detail.length, { ensureRows: false }));
        meta.sheets.filter((s) => [sid, did].includes(s.properties.sheetId)).forEach((s) => {
          var isDaily = s.properties.sheetId === sid, count = isDaily ? lastS : Math.max(8, lastD), width = isDaily ? 14 : 18;
          (s.tables || []).forEach((t) => {
            var outlay2 = isDaily && esimIsOutlayTable(t);
            req.push({ updateTable: { table: { tableId: t.tableId, range: esimRect(s.properties.sheetId, isDaily ? 11 : 6, count, outlay2 ? 16 : 0, outlay2 ? t.range.endColumnIndex : width) }, fields: "range" } });
          });
          (s.conditionalFormats || []).forEach((rule, i) => {
            rule.ranges = rule.ranges.map((r) => r.startRowIndex >= (isDaily ? 12 : 7) ? Object.assign({}, r, { endRowIndex: count }) : r);
            req.push({ updateConditionalFormatRule: { sheetId: s.properties.sheetId, index: i, rule } });
          });
        });
        req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "ROWS", startIndex: 12, endIndex: lastS }, properties: { pixelSize: 52 }, fields: "pixelSize" } });
        req.push(esimWrite(sid, 1, 2, [["\u5DF2\u5199\u5165 " + job.day + "\uFF0C\u6B63\u5728\u6838\u9A8C\u7ED3\u679C\u2026"]]));
        Sheets.Spreadsheets.batchUpdate({ requests: req }, ESIM_CFG.spreadsheetId);
        SpreadsheetApp.flush();
        var written = esimReadRows("\u5730\u5740\u660E\u7EC6", "R"), dayRows = written.filter((r) => r[0] === esimSerial(job.day));
        if (dayRows.length !== rep.rows.length) throw new Error("\u8868\u683C\u5199\u5165\u540E\u7684\u884C\u6570\u672A\u6838\u5B9E\uFF0C\u8BF7\u52FF\u91CD\u590D\u624B\u6539\u6570\u636E");
        dayRows.forEach((r, i) => {
          for (var c = 0; c < 17; c++) {
            var a = r[c] === void 0 ? "" : r[c], b = rep.rows[i][c] === null ? "" : rep.rows[i][c];
            if (typeof a === "number" && typeof b === "number") {
              if (Math.abs(a - b) > Math.max(1e-12, Math.abs(b) * 1e-13)) throw new Error("\u8868\u683C\u5199\u5165\u540E\u6570\u503C\u672A\u6838\u5B9E\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
            } else if (a !== b) throw new Error("\u8868\u683C\u5199\u5165\u540E\u6570\u503C\u672A\u6838\u5B9E\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
          }
        });
        var numeric = rep.rows.length ? Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u5730\u5740\u660E\u7EC6'!A" + (at + 1) + ":R" + (at + rep.rows.length), { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" }).values || [] : [];
        if (numeric.length !== rep.rows.length) throw new Error("\u660E\u7EC6\u6570\u503C\u56DE\u8BFB\u884C\u6570\u4E0D\u5B8C\u6574\uFF0C\u4E0D\u80FD\u6807\u8BB0\u5B8C\u6210");
        var summary = Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u6BCF\u65E5\u6536\u652F'!A" + summaryRow + ":P" + summaryRow, { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" }).values || [];
        esimValidatePublished(job, numeric, summary[0], "\u5F85\u6838\u9A8C");
        if (typeof esimValidateOutlayRows === "function") {
          var outlay = Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u6BCF\u65E5\u6536\u652F'!Q" + summaryRow + ":R" + summaryRow, { valueRenderOption: "UNFORMATTED_VALUE" }).values || [];
          esimValidateOutlayRows([summary[0].slice(0, 16).concat(outlay[0] || [])], numeric);
        }
        if (typeof esimSyncExternalTransfers === "function") esimSyncExternalTransfers(job);
        if (typeof esimRefreshDailyExternal === "function") esimRefreshDailyExternal();
        try {
          if (job.cohort && typeof esimCheckCurrentRegistry === "function") esimCheckCurrentRegistry(job);
          var finalStatus = job.partial ? "\u8FDB\u884C\u4E2D" : "\u5DF2\u5B8C\u6210";
          Sheets.Spreadsheets.batchUpdate({ requests: statusRequests(finalStatus) }, ESIM_CFG.spreadsheetId);
          SpreadsheetApp.flush();
          var committed = Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u6BCF\u65E5\u6536\u652F'!N" + summaryRow + ":P" + summaryRow, { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" }).values || [];
          if (!committed[0] || committed[0][0] !== finalStatus || committed[0][1] !== esimSerial(job.day) || committed[0][2] !== esimSerial(job.state.boundaries[1].time)) throw new Error("\u5B8C\u6210\u72B6\u6001\u6216\u65E5\u671F\u63D0\u4EA4\u672A\u786E\u8BA4\uFF0C\u8BF7\u91CD\u65B0\u66F4\u65B0");
          if (job.cohort && typeof esimCheckCurrentRegistry === "function") esimCheckCurrentRegistry(job);
        } catch (error) {
          try {
            Sheets.Spreadsheets.batchUpdate({ requests: statusRequests("\u5F85\u6838\u9A8C") }, ESIM_CFG.spreadsheetId);
            SpreadsheetApp.flush();
          } catch (ignored) {
            throw new Error("\u5B8C\u6210\u72B6\u6001\u63D0\u4EA4\u672A\u786E\u8BA4\uFF0C\u5F85\u6838\u9A8C\u6807\u8BB0\u4E5F\u672A\u786E\u8BA4\uFF1B\u8BF7\u68C0\u67E5\u76EE\u6807\u65E5\u62A5\u540E\u91CD\u65B0\u66F4\u65B0");
          }
          throw error;
        }
        if (typeof esimRefreshPeriodControls === "function") esimRefreshPeriodControls();
        job.publishedAt = (/* @__PURE__ */ new Date()).toISOString();
        job.stage = "done";
        esimSaveJob(job);
        return view;
      }
      function esimValidatePublished(job, detail, summary, expectedStatus) {
        var hour = String(ESIM_CFG.dailyStartHour).padStart(2, "0") + ":00";
        if (!summary || summary.length < 16 || summary[13] !== (expectedStatus || "\u5DF2\u5B8C\u6210") || summary[14] !== esimSerial(job.day) || summary[15] !== esimSerial(job.state.boundaries[1].time) || typeof summary[12] !== "string" || !summary[12].includes(hour)) throw new Error("\u6C47\u603B\u516C\u5F0F\u672A\u6838\u5B9E\uFF0C\u4E0D\u80FD\u6807\u8BB0\u5B8C\u6210");
        detail.forEach((r) => {
          if (r.length < 18 || typeof r[17] !== "number" || r[17] !== 0) throw new Error("\u660E\u7EC6\u6838\u5BF9\u516C\u5F0F\u672A\u901A\u8FC7\uFF0C\u4E0D\u80FD\u6807\u8BB0\u5B8C\u6210");
        });
        var rows = job.result.daily, sum = (k) => rows.reduce((n, r) => n + r[k], 0), buy = sum("\u4E70\u5165ESIM") + sum("bnbBuyESIM"), paid = -sum("\u4E70\u5165USDT"), sold = -sum("\u5356\u51FAESIM"), earned = sum("\u5356\u51FAUSDT"), coin = sum("closingESIM") + sum("closingLPESIM"), u = sum("closingUSDT") + sum("closingLPUSDT"), price = job.price.price;
        [buy, paid, sold, earned, buy - sold, earned - paid, coin, u, price, coin * price + u].forEach((v, i) => {
          var actual = summary[i + 1];
          if (typeof actual !== "number" || !Number.isFinite(actual) || Math.abs(actual - v) > Math.max(1e-7, Math.abs(v) * 1e-12)) throw new Error("\u6C47\u603B\u8BA1\u7B97\u4E0E\u94FE\u4E0A\u8D26\u672C\u4E0D\u4E00\u81F4\uFF0C\u4E0D\u80FD\u6807\u8BB0\u5B8C\u6210");
        });
      }
      var ESIM_EXTERNAL_SHEET_ID = 2601006;
      function esimExternalRequire(ok, message) {
        if (!ok) throw new Error("\u5BF9\u5916\u8F6C\u8D26\uFF1A" + message);
      }
      function esimExternalNormalizeRows(rows) {
        return rows.map((r) => {
          esimExternalRequire(r.length === 12 || r.length === 13, "\u5DF2\u6709\u660E\u7EC6\u5217\u6570\u4E0D\u6B63\u786E");
          return r.length === 12 ? r.slice(0, 3).concat([0], r.slice(3)) : r.slice();
        });
      }
      function esimExternalIsFee(receipt, from, to) {
        return receipt.logs.some((l) => {
          var ts = l.topics || [];
          if (ts.length !== 4 || ts[0] !== "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f" || "0x" + ts[2].slice(-40).toLowerCase() !== from.toLowerCase() || "0x" + ts[3].slice(-40).toLowerCase() !== to.toLowerCase()) return false;
          var body = String(l.data || "").slice(2);
          return body.length >= 128 && BigInt("0x" + body.slice(64, 128)) === 1n;
        });
      }
      function esimExternalRows(job, addresses) {
        var result = job.result, cohort = new Set(addresses.map((a) => a.toLowerCase())), seen = /* @__PURE__ */ new Set(), contexts = {}, rows = [], review = 0;
        esimExternalRequire(result && Array.isArray(result.flows) && Array.isArray(result.transactions) && job.receipts, "\u7F3A\u5C11\u9010\u7B14\u51ED\u8BC1");
        result.transactions.forEach((t) => {
          var key2 = t.hash.toLowerCase() + "|" + t.wallet.toLowerCase();
          esimExternalRequire(!contexts[key2], "\u4EA4\u6613\u5206\u7C7B\u91CD\u590D");
          contexts[key2] = t;
        });
        var transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", userop = "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f";
        function address2(topic) {
          return "0x" + String(topic).slice(-40).toLowerCase();
        }
        result.flows.forEach((f) => {
          if (!["USDT", "ESIM"].includes(f.asset) || !cohort.has(f.from.toLowerCase()) || cohort.has(f.to.toLowerCase())) return;
          var key2 = f.hash.toLowerCase() + ":" + f.logIndex;
          esimExternalRequire(!seen.has(key2), "\u8F6C\u8D26\u8BB0\u5F55\u91CD\u590D");
          seen.add(key2);
          esimExternalRequire(typeof f.amountRaw === "string" && /^\d+$/.test(f.amountRaw) && BigInt(f.amountRaw) > 0n, "\u91D1\u989D\u7F3A\u5931\u6216\u4E0D\u6B63\u786E");
          var r = job.receipts[f.hash], t = contexts[f.hash.toLowerCase() + "|" + f.from.toLowerCase()];
          esimExternalRequire(r && BigInt(r.status) === 1n && Array.isArray(r.logs) && t, "\u7F3A\u5C11\u6210\u529F\u56DE\u6267\u6216\u4EA4\u6613\u5206\u7C7B");
          var contract = f.asset === "ESIM" ? ESIM_CFG.token : ESIM_CFG.usdt;
          var matches = r.logs.filter((l) => String(l.address).toLowerCase() === contract && l.topics && l.topics.length === 3 && l.topics[0] === transfer && l.logIndex !== void 0 && Number(BigInt(l.logIndex)) === f.logIndex && address2(l.topics[1]) === f.from.toLowerCase() && address2(l.topics[2]) === f.to.toLowerCase() && !l.removed && BigInt(l.data) === BigInt(f.amountRaw));
          esimExternalRequire(matches.length === 1, "\u8F6C\u8D26\u91D1\u989D\u4E0E\u56DE\u6267\u51ED\u8BC1\u4E0D\u4E00\u81F4");
          if (esimExternalIsFee(r, f.from, f.to)) return;
          var otherToken = r.logs.some((l) => {
            var ts = l.topics || [], contract2 = String(l.address).toLowerCase();
            return ts.length === 3 && ts[0] === transfer && contract2 !== ESIM_CFG.usdt && contract2 !== ESIM_CFG.token && (address2(ts[1]) === f.from.toLowerCase() || address2(ts[2]) === f.from.toLowerCase()) && /^0x[0-9a-f]+$/i.test(String(l.data)) && BigInt(l.data) > 0n;
          });
          if (t.needsReview || t.unrecognizedExchange || t.nonEsimSwapWarning || t.mixedSwapWarning || otherToken) {
            review++;
            return;
          }
          if (t.type !== "\u5916\u90E8\u8F6C\u8D26") return;
          esimExternalRequire(f.day === job.day && Number.isFinite(Date.parse(f.time)) && Date.parse(f.time) >= Date.parse(job.state.boundaries[0].time) && Date.parse(f.time) < Date.parse(job.state.boundaries[1].time), "\u8F6C\u8D26\u65F6\u95F4\u8D85\u51FA\u672C\u7EDF\u8BA1\u65E5");
          var amount = Number(f.amountRaw + "e-18");
          rows.push(["", esimSerial(f.time), f.asset === "USDT" ? amount : 0, f.asset === "ESIM" ? amount : 0, f.from.toLowerCase(), f.to.toLowerCase(), "", esimSerial(job.day), f.amountRaw, f.hash.toLowerCase(), f.logIndex, job.cohort ? job.cohort.signature : "", esimSerial(job.state.boundaries[1].time)]);
        });
        return { rows, reviewExcluded: review };
      }
      function esimMergeExternalRows(existing, incoming, day, addresses) {
        var cohort = new Set(addresses.map((a) => a.toLowerCase())), target = day ? esimSerial(day) : null, seen = /* @__PURE__ */ new Set();
        var rows = esimExternalNormalizeRows(existing).filter((r) => target === null || r[7] !== target).concat(esimExternalNormalizeRows(incoming)).filter((r) => {
          esimExternalRequire(Number.isSafeInteger(r[7]) && Number.isFinite(r[1]) && typeof r[8] === "string" && /^\d+$/.test(r[8]) && BigInt(r[8]) > 0n && /^0x[0-9a-f]{64}$/.test(r[9]) && Number.isSafeInteger(r[10]) && r[10] >= 0 && Number.isFinite(r[12]), "\u5DF2\u6709\u660E\u7EC6\u539F\u59CB\u5B57\u6BB5\u4E0D\u5B8C\u6574\uFF0C\u8BF7\u52FF\u624B\u6539");
          var amount = r[2] + r[3];
          esimExternalRequire(/^0x[0-9a-f]{40}$/.test(r[4]) && /^0x[0-9a-f]{40}$/.test(r[5]) && [r[2], r[3]].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) && (r[2] > 0 && r[3] === 0 || r[3] > 0 && r[2] === 0) && Math.abs(amount - Number(r[8] + "e-18")) <= Math.max(1e-9, amount * 1e-12), "\u5DF2\u6709\u8F6C\u8D26\u91D1\u989D\u6216\u5730\u5740\u88AB\u6539\u52A8");
          if (!cohort.has(r[4]) || cohort.has(r[5])) return false;
          var key2 = r[9] + ":" + r[10];
          esimExternalRequire(!seen.has(key2), "\u5DF2\u6709\u8F6C\u8D26\u8BB0\u5F55\u91CD\u590D");
          seen.add(key2);
          return true;
        });
        rows.sort((a, b) => b[1] - a[1] || b[10] - a[10] || a[9].localeCompare(b[9]));
        return rows.map((r, i) => {
          var row = r.slice();
          row[0] = "=TEXT(H" + (i + 8) + ',"yymmdd")&"-"&TEXT(H' + (i + 8) + '+1,"mmdd")';
          row[6] = '=HYPERLINK("https://bscscan.com/tx/' + r[9] + '","\u67E5\u770B\u4EA4\u6613")';
          return row;
        });
      }
      function esimExternalRead() {
        var s = esimBook().getSheetByName("\u5BF9\u5916\u8F6C\u8D26");
        if (!s) return [];
        esimExternalRequire(s.getSheetId() === ESIM_EXTERNAL_SHEET_ID, "\u5DE5\u4F5C\u8868\u6807\u8BC6\u4E0D\u7B26");
        var last = s.getLastRow();
        if (last < 8) return [];
        var end = s.getMaxColumns() >= 13 ? "M" : "L";
        return esimExternalNormalizeRows((Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u5BF9\u5916\u8F6C\u8D26'!A8:" + end + last, { valueRenderOption: "FORMULA", dateTimeRenderOption: "SERIAL_NUMBER" }).values || []).filter((r) => r.length));
      }
      function esimExternalRequests(meta, rows, oldCount, coverage) {
        var sid = ESIM_EXTERNAL_SHEET_ID, s = (meta.sheets || []).find((s2) => s2.properties.sheetId === sid), last = Math.max(8, rows.length + 7), req = [], grid = s ? s.properties.gridProperties : {};
        rows = esimExternalNormalizeRows(rows);
        esimExternalRequire(!s || s.properties.title === "\u5BF9\u5916\u8F6C\u8D26", "\u5DE5\u4F5C\u8868\u6807\u8BC6\u5DF2\u5360\u7528");
        if (!s) req.push({ addSheet: { properties: { sheetId: sid, title: "\u5BF9\u5916\u8F6C\u8D26", gridProperties: { rowCount: Math.max(200, last + 20), columnCount: 13, frozenRowCount: 7, hideGridlines: true } } } });
        else {
          if (grid.rowCount <= last) req.push({ appendDimension: { sheetId: sid, dimension: "ROWS", length: last - grid.rowCount + 20 } });
          if (grid.columnCount < 13) req.push({ appendDimension: { sheetId: sid, dimension: "COLUMNS", length: 13 - grid.columnCount } });
        }
        req.push({ updateCells: { range: esimRect(sid, 0, 1, 6, 13), fields: "userEnteredValue" } });
        [[1, 2, 2, 7], [2, 3, 0, 7], [4, 5, 0, 7]].forEach((x) => {
          if (s) req.push({ unmergeCells: { range: esimRect(sid, ...x) } });
          req.push({ mergeCells: { range: esimRect(sid, ...x), mergeType: "MERGE_ALL" } });
        });
        req.push(esimWrite(sid, 0, 0, [["USDT / ESIM \u5BF9\u5916\u8F6C\u8D26"]]));
        req.push(esimWrite(sid, 1, 0, [["\u624B\u52A8\u66F4\u65B0 \u2192", false, "='\u6BCF\u65E5\u6536\u652F'!C2"]]));
        req.push(esimWrite(sid, 2, 0, [["\u53EA\u770B U \u548C ESIM \u8F6C\u7ED9\u5730\u5740\u5E93\u4EE5\u5916\u7684\u5730\u5740\u3002\u4E70\u5356\u3001LP\u3001\u5151\u6362\u3001\u624B\u7EED\u8D39\u548C\u5730\u5740\u5E93\u5185\u4E92\u8F6C\u90FD\u4E0D\u653E\u8FDB\u6765\uFF1B\u6536\u6B3E\u7528\u9014\u5C1A\u672A\u6807\u6CE8\u3002"]]));
        req.push(esimWrite(sid, 3, 0, [["\u7D2F\u8BA1\u8F6C\u51FA U", "=SUM(C8:C" + last + ")", "\u7D2F\u8BA1\u8F6C\u51FA ESIM", "=SUM(D8:D" + last + ")", "\u8F6C\u8D26\u6761\u6570", "=COUNTA(J8:J" + last + ")", ""]]));
        req.push(esimWrite(sid, 4, 0, [[coverage || "\u81EA\u52A8\u540C\u6B65\u6BCF\u65E5\u7EDF\u8BA1\u7ED3\u679C\u3002\u65B0\u589E\u5730\u5740\u540E\uFF0C\u5386\u53F2\u4F1A\u9010\u65E5\u8865\u9F50\u3002"]]));
        var headers = ["\u7EDF\u8BA1\u65E5\uFF0808\u70B9\u81F3\u6B21\u65E508\u70B9\uFF09", "\u8F6C\u51FA\u65F6\u95F4\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09", "\u8F6C\u51FA USDT", "\u8F6C\u51FA ESIM", "\u4ED8\u6B3E\u5730\u5740", "\u6536\u6B3E\u5730\u5740", "\u94FE\u4E0A\u8BB0\u5F55", "\u65E5\u671F\u952E", "\u539F\u59CB\u91D1\u989D", "\u4EA4\u6613\u54C8\u5E0C", "\u65E5\u5FD7\u5E8F\u53F7", "\u5730\u5740\u8303\u56F4\u7B7E\u540D", "\u7EDF\u8BA1\u622A\u81F3"];
        req.push(esimWrite(sid, 6, 0, [headers]));
        if (rows.length) req.push(esimWrite(sid, 7, 0, rows));
        if (oldCount > rows.length) req.push({ updateCells: { range: esimRect(sid, 7 + rows.length, 7 + oldCount, 0, 13), fields: "userEnteredValue" } });
        var navy = { red: 0.09, green: 0.17, blue: 0.29 }, white = { red: 1, green: 1, blue: 1 }, ink = { red: 0.12, green: 0.16, blue: 0.21 };
        req.push(esimFormat(sid, 0, last, 0, 7, { textFormat: { fontFamily: "Arial", fontSize: 10, foregroundColor: ink }, verticalAlignment: "MIDDLE" }));
        req.push(esimFormat(sid, 0, 1, 0, 7, { backgroundColor: navy, textFormat: { bold: true, fontSize: 14, foregroundColor: white } }));
        req.push(esimFormat(sid, 6, 7, 0, 7, { backgroundColor: navy, textFormat: { bold: true, foregroundColor: white }, wrapStrategy: "WRAP", horizontalAlignment: "CENTER" }));
        req.push(esimFormat(sid, 7, last, 1, 2, { numberFormat: { type: "DATE_TIME", pattern: "yy-mm-dd hh:mm:ss" } }));
        req.push(esimFormat(sid, 7, last, 2, 4, { numberFormat: { type: "NUMBER", pattern: '#,##0.00;[Red]-#,##0.00;"\u2013"' } }));
        req.push(esimFormat(sid, 7, last, 3, 4, { textFormat: { fontFamily: "Arial", fontSize: 10, foregroundColor: { red: 0.12, green: 0.35, blue: 0.72 } } }));
        req.push(esimFormat(sid, 7, last, 4, 6, { numberFormat: { type: "TEXT" }, wrapStrategy: "CLIP" }));
        req.push(esimFormat(sid, 7, last, 8, 12, { numberFormat: { type: "TEXT" } }));
        req.push(esimFormat(sid, 1, 2, 1, 2, { backgroundColor: { red: 1, green: 0.95, blue: 0.8 } }));
        req.push(esimFormat(sid, 2, 5, 0, 7, { wrapStrategy: "WRAP" }));
        [1, 3].forEach((c) => req.push(esimFormat(sid, 3, 4, c, c + 1, { numberFormat: { type: "NUMBER", pattern: "#,##0.00" }, textFormat: { bold: true, fontSize: 13 }, wrapStrategy: "CLIP" })));
        req.push(esimFormat(sid, 3, 4, 3, 4, { textFormat: { fontFamily: "Arial", bold: true, fontSize: 13, foregroundColor: { red: 0.12, green: 0.35, blue: 0.72 } } }));
        req.push({ setDataValidation: { range: esimRect(sid, 1, 2, 1, 2), rule: { condition: { type: "BOOLEAN" }, strict: true, showCustomUi: true } } });
        [150, 175, 135, 150, 355, 355, 110].forEach((w, i) => req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w, hiddenByUser: false }, fields: "pixelSize,hiddenByUser" } }));
        req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "COLUMNS", startIndex: 7, endIndex: 13 }, properties: { hiddenByUser: true }, fields: "hiddenByUser" } });
        req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "ROWS", startIndex: 0, endIndex: last }, properties: { pixelSize: 28 }, fields: "pixelSize" } });
        req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "ROWS", startIndex: 2, endIndex: 3 }, properties: { pixelSize: 38 }, fields: "pixelSize" } });
        req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "ROWS", startIndex: 6, endIndex: 7 }, properties: { pixelSize: 38 }, fields: "pixelSize" } });
        var tables = s ? s.tables || [] : [];
        esimExternalRequire(tables.length <= 1, "\u6709\u672A\u77E5\u8868\u683C\u5BF9\u8C61\uFF0C\u505C\u6B62\u8986\u76D6");
        var table = { range: esimRect(sid, 6, last, 0, 7), columnProperties: headers.slice(0, 7).map((name, i) => ({ columnIndex: i, columnName: name, columnType: "COLUMN_TYPE_UNSPECIFIED" })) };
        if (tables.length) {
          table.tableId = tables[0].tableId;
          req.push({ updateTable: { table, fields: "range,columnProperties" } });
        } else {
          table.name = "ExternalTransfers";
          req.push({ addTable: { table } });
        }
        return req;
      }
      function esimExternalVerify(expected) {
        var values = expected.length ? Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u5BF9\u5916\u8F6C\u8D26'!A8:M" + (expected.length + 7), { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" }).values || [] : [];
        esimExternalRequire(values.length === expected.length, "\u5199\u5165\u884C\u6570\u672A\u6838\u5B9E");
        values.forEach((row, i) => {
          [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12].forEach((c) => {
            var a = row[c], b = expected[i][c];
            esimExternalRequire(typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-12) : a === b, "\u5199\u5165\u91D1\u989D\u3001\u5730\u5740\u6216\u539F\u59CB\u5B57\u6BB5\u672A\u6838\u5B9E");
          });
        });
        var tail = Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u5BF9\u5916\u8F6C\u8D26'!J" + (expected.length + 8) + ":J" + (expected.length + 8), { valueRenderOption: "UNFORMATTED_VALUE" }).values || [];
        esimExternalRequire(!tail.length || !tail[0].length, "\u65E7\u5C3E\u884C\u672A\u6E05\u9664");
      }
      function esimExternalCoverage(job, signature) {
        var p = esimProps(), baseline = JSON.parse(p.getProperty("ESIM_EXTERNAL_BASELINE") || "null");
        if (!baseline) return "\u5386\u53F2\u8F6C\u8D26\u5DF2\u5BFC\u5165\uFF1B\u540E\u7EED\u548C\u6BCF\u65E5\u7EDF\u8BA1\u4E00\u8D77\u66F4\u65B0\u3002";
        var through = job ? Math.max(baseline.through, esimSerial(job.state.boundaries[1].time)) : baseline.through;
        var last = esimDayFromSerial(through - ESIM_CFG.dailyStartHour / 24 - 1e-8), complete = true;
        for (var d = ESIM_CFG.startDay; d <= last; d = esimPlusDay(d, 1)) {
          if ((job && job.day === d ? signature : p.getProperty("ESIM_EXTERNAL_DAY_COHORT_" + d)) !== signature) {
            complete = false;
            break;
          }
        }
        if (complete) {
          baseline.signature = signature;
          baseline.through = through;
          baseline.count = ESIM_CFG.addresses.length;
        }
        var esimComplete = true;
        for (var ed = ESIM_CFG.startDay; ed <= last; ed = esimPlusDay(ed, 1)) {
          if ((job && job.day === ed ? signature : p.getProperty("ESIM_EXTERNAL_ESIM_DAY_COHORT_" + ed)) !== signature) {
            esimComplete = false;
            break;
          }
        }
        var text = baseline.signature === signature ? "U \u5DF2\u6838\u5B9E\u81F3 " + new Date(Math.round((baseline.through - 25569) * 864e5)).toISOString().slice(2, 16).replace("T", " ") + "\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09\u3002\u6BCF\u592908:00\u540E\u968F\u6BCF\u65E5\u7EDF\u8BA1\u66F4\u65B0\uFF1B\u65B0\u589E\u5730\u5740\u7684\u5386\u53F2\u4F1A\u81EA\u52A8\u8865\u9F50\u3002" : "\u5730\u5740\u5E93\u5DF2\u589E\u52A0\uFF0C\u6B63\u5728\u8865\u5386\u53F2\uFF1B\u5F53\u524D\u5217\u8868\u548C\u5408\u8BA1\u6682\u4E0D\u4EE3\u8868\u5168\u90E8\u5730\u5740\u7684\u5B8C\u6574\u8F6C\u51FA\u3002";
        text += esimComplete ? " ESIM \u540C\u671F\u5386\u53F2\u5DF2\u6838\u5B9E\u3002" : " ESIM \u5386\u53F2\u5F85\u8865\u9F50\uFF0C\u5F53\u524D\u5E01\u91CF\u5408\u8BA1\u5C1A\u975E\u5B8C\u6574\u7D2F\u8BA1\u3002";
        return { baseline, day: job && job.day, signature, esimComplete, text };
      }
      function esimRefreshExternalReceipts(job, addresses) {
        var cohort = new Set(addresses), contexts = {}, hashes = /* @__PURE__ */ new Set();
        job.result.transactions.forEach((t) => {
          contexts[t.hash + "|" + t.wallet] = t;
        });
        job.result.flows.forEach((f) => {
          var t = contexts[f.hash + "|" + f.from], receipt = job.receipts[f.hash];
          if (["USDT", "ESIM"].includes(f.asset) && cohort.has(f.from) && !cohort.has(f.to) && t && t.type === "\u5916\u90E8\u8F6C\u8D26" && (!receipt || receipt.esimReceiptSchema !== 2)) hashes.add(f.hash);
        });
        var list = Array.from(hashes);
        if (!list.length) return;
        list.forEach((hash2) => {
          var key2 = JSON.stringify(["eth_getTransactionReceipt", [hash2]]);
          if (job.rpc && job.rpc[key2] && job.rpc[key2].esimReceiptSchema !== 2) delete job.rpc[key2];
        });
        var fresh = esimRpcMany(list.map((hash2) => ["eth_getTransactionReceipt", [hash2]]));
        list.forEach((hash2, i) => {
          esimExternalRequire(fresh[i] && fresh[i].esimReceiptSchema === 2, "\u4EE3\u4ED8\u8D39\u7528\u51ED\u8BC1\u672A\u5237\u65B0\uFF0C\u4E0D\u80FD\u5206\u7C7B");
          job.receipts[hash2] = fresh[i];
        });
      }
      function esimUpgradeExternalRows(rows, job) {
        rows = esimExternalNormalizeRows(rows);
        if (!rows.length) return rows;
        var hashes = Array.from(new Set(rows.map((r) => r[9])));
        hashes.forEach((hash2) => {
          var key2 = JSON.stringify(["eth_getTransactionReceipt", [hash2]]);
          if (job.rpc && job.rpc[key2] && job.rpc[key2].esimReceiptSchema !== 2) delete job.rpc[key2];
        });
        var receipts = esimRpcMany(hashes.map((hash2) => ["eth_getTransactionReceipt", [hash2]])), byHash = {};
        hashes.forEach((hash2, i) => {
          byHash[hash2] = receipts[i];
        });
        return rows.filter((row) => {
          var r = byHash[row[9]];
          esimExternalRequire(r && r.esimReceiptSchema === 2 && BigInt(r.status) === 1n && r.transactionHash === row[9], "\u5386\u53F2\u8F6C\u8D26\u8D39\u7528\u51ED\u8BC1\u672A\u6838\u5B9E");
          var contract = row[3] > 0 ? ESIM_CFG.token : ESIM_CFG.usdt;
          var matches = r.logs.filter((l) => String(l.address).toLowerCase() === contract && l.topics && l.topics.length === 3 && l.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" && Number(BigInt(l.logIndex)) === row[10] && "0x" + l.topics[1].slice(-40).toLowerCase() === row[4] && "0x" + l.topics[2].slice(-40).toLowerCase() === row[5] && !l.removed && BigInt(l.data) === BigInt(row[8]));
          esimExternalRequire(matches.length === 1, "\u5386\u53F2\u8F6C\u8D26\u4E0E\u56DE\u6267\u91D1\u989D\u4E0D\u4E00\u81F4");
          return !esimExternalIsFee(r, row[4], row[5]);
        });
      }
      function esimSyncExternalTransfers(job) {
        var ss = esimBook(), sheet = ss.getSheetByName("\u5BF9\u5916\u8F6C\u8D26");
        if (!sheet) {
          esimExternalRequire(esimProps().getProperty("ESIM_EXTERNAL_INSTALLED") !== "1", "\u5DE5\u4F5C\u8868\u88AB\u79FB\u8D70\u6216\u5220\u9664");
          return;
        }
        var addresses = ESIM_CFG.addresses;
        esimRefreshExternalReceipts(job, addresses);
        var old = esimExternalRead(), oldCount = old.length, upgrade = !["2", "3"].includes(esimProps().getProperty("ESIM_EXTERNAL_VIEW_SCHEMA"));
        if (upgrade) old = esimUpgradeExternalRows(old, job);
        var incoming = esimExternalRows(job, addresses), rows = esimMergeExternalRows(old, incoming.rows, job.day, addresses), signature = job.cohort ? job.cohort.signature : esimRegistrySignature(addresses), coverage = esimExternalCoverage(job, signature);
        var text = typeof coverage === "string" ? coverage : coverage.text;
        if (incoming.reviewExcluded) text += " \u672C\u6B21\u6709" + incoming.reviewExcluded + "\u6761\u534F\u8BAE/\u5151\u6362\u7C7B\u522B\u5F85\u786E\u8BA4\uFF0C\u672A\u6DF7\u5165\u666E\u901A\u8F6C\u8D26\u3002";
        var meta = Sheets.Spreadsheets.get(ESIM_CFG.spreadsheetId, { fields: "sheets(properties,tables)" });
        Sheets.Spreadsheets.batchUpdate({ requests: esimExternalRequests(meta, rows, oldCount, text) }, ESIM_CFG.spreadsheetId);
        SpreadsheetApp.flush();
        esimExternalVerify(rows);
        if (typeof coverage !== "string") {
          esimProps().setProperty("ESIM_EXTERNAL_BASELINE", JSON.stringify(coverage.baseline));
          esimProps().setProperty("ESIM_EXTERNAL_DAY_COHORT_" + job.day, signature);
        }
        esimProps().setProperty("ESIM_EXTERNAL_ESIM_DAY_COHORT_" + job.day, signature);
        esimProps().setProperty("ESIM_EXTERNAL_VIEW_SCHEMA", "3");
        return { day: job.day, rows: incoming.rows.length, totalRows: rows.length };
      }
      function esimExternalEdited(e) {
        if (e.range.getSheet().getName() !== "\u5BF9\u5916\u8F6C\u8D26") return false;
        if (e.range.getA1Notation() === "B2" && String(e.value) === "TRUE") {
          e.range.setValue(false);
          esimManualUpdate();
        }
        return true;
      }
      function esimInstallExternalTransfers() {
        var lock = LockService.getScriptLock();
        if (!lock.tryLock(1e3)) throw new Error("\u91C7\u96C6\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u7A0D\u540E");
        try {
          var p = esimProps(), ss = esimBook(), registry = esimReadAddressRegistry(), old = esimExternalRead(), rows = esimMergeExternalRows(old, [], null, registry.addresses);
          var installed = p.getProperty("ESIM_EXTERNAL_INSTALLED") === "1", baseline = installed ? JSON.parse(p.getProperty("ESIM_EXTERNAL_BASELINE") || "null") : null;
          if (!installed) {
            esimExternalRequire(rows.length > 0, "\u5386\u53F2\u79CD\u5B50\u5C1A\u672A\u5199\u5165");
            var seed = Sheets.Spreadsheets.Values.get(ESIM_CFG.spreadsheetId, "'\u5BF9\u5916\u8F6C\u8D26'!G1:J1", { valueRenderOption: "UNFORMATTED_VALUE" }).values || [];
            esimExternalRequire(seed[0] && seed[0][0] === "ESIM_EXTERNAL_V1" && Number.isFinite(seed[0][1]) && seed[0][2] === registry.signature && seed[0][3] === esimSerial(ESIM_CFG.startDay), "\u5386\u53F2\u79CD\u5B50\u8303\u56F4\u672A\u6838\u5B9E");
            baseline = { through: seed[0][1], signature: registry.signature, count: registry.addresses.length };
          }
          esimExternalRequire(baseline && Number.isFinite(baseline.through) && typeof baseline.signature === "string", "\u540C\u6B65\u8303\u56F4\u7F3A\u5931");
          var meta = Sheets.Spreadsheets.get(ESIM_CFG.spreadsheetId, { fields: "sheets(properties,tables)" });
          var coverage = esimExternalCoverage(null, registry.signature), caption = typeof coverage === "string" ? coverage : coverage.text;
          if (installed && baseline.signature !== registry.signature) caption = "\u5730\u5740\u5E93\u5DF2\u589E\u52A0\uFF0C\u6B63\u5728\u8865\u5386\u53F2\uFF1B\u5F53\u524D\u5408\u8BA1\u6682\u4E0D\u4EE3\u8868\u5168\u90E8\u5730\u5740\u3002";
          Sheets.Spreadsheets.batchUpdate({ requests: esimExternalRequests(meta, rows, old.length, caption) }, ESIM_CFG.spreadsheetId);
          SpreadsheetApp.flush();
          esimExternalVerify(rows);
          p.setProperty("ESIM_EXTERNAL_BASELINE", JSON.stringify(baseline));
          if (!installed) {
            var last = esimDayFromSerial(baseline.through - ESIM_CFG.dailyStartHour / 24 - 1e-8);
            for (var day = ESIM_CFG.startDay; day <= last; day = esimPlusDay(day, 1)) p.setProperty("ESIM_EXTERNAL_DAY_COHORT_" + day, registry.signature);
          }
          p.setProperty("ESIM_EXTERNAL_INSTALLED", "1");
          p.setProperty("ESIM_EXTERNAL_VIEW_SCHEMA", "3");
          p.deleteProperty("ESIM_MIGRATING");
          console.log(JSON.stringify({ verified: true, externalRows: rows.length, ordinaryU: rows.reduce((s, r) => s + r[2], 0), ordinaryESIM: rows.reduce((s, r) => s + r[3], 0), autoUpdate: "same existing ESIM timer and manual updater" }));
        } finally {
          lock.releaseLock();
        }
      }
      ESIM_CFG.verifiedNonEsimResolutions.push(...[{ "hash": "0x6abcf6989288b693fb836314a0faa5159a5bf0632c199eed4f65baa8a7fdda36", "wallet": "0x3759db8f9245291c5a710fdf807e95245e6c4122", "chainId": 56, "blockHash": "0xb33422fd7e9ba36918d93395d863b56033e518a2331197c4808056469bed1de4", "blockNumber": 129842252, "expectedUSDTraw": "-35000000000000000000", "expectedBNBraw": "47017037118063984", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u6838\u5B9E\u6210\u529F\u8C03\u7528\uFF1AUSDT\u7ECF\u8DEF\u7531\u5151\u6362\u4E3AWBNB\uFF0C\u518D\u89E3\u5305\u6210\u540C\u91CFBNB\u56DE\u5230\u672C\u94B1\u5305\uFF1B\u8DEF\u7531\u7559\u5B58\u5DF2\u5305\u542B\u5728USDT\u51C0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u53E6\u6263\u3002\u4E0D\u6D89\u53CAESIM\u4E70\u5356\u6216LP\u3002", "evidence": [{ "receiptSHA256": "08f4c620b017864026e8e25d693e624acbd3f7f9e942d248c58814ceb067ef95", "traceSHA256": "16601f1a8972d15a61accadbaaf56eaa376ebe92cb2396c4f7f3ec91db4ab7ec", "receiptStatus": "0x1", "wrappedBNBOutputRaw": "47017037118063984", "nativeReceivedRaw": "47017037118063984", "walletUSDTDeltaRaw": "-35000000000000000000", "source": "block-pinned receipt and successful callTracer", "transactionURL": "https://bscscan.com/tx/0x6abcf6989288b693fb836314a0faa5159a5bf0632c199eed4f65baa8a7fdda36" }] }, { "hash": "0x1ba2a80b460102036e7a58dfe8b2f13ac246fa5f9ea6ab3d87d11d4628fae9fb", "wallet": "0xb9419aa4ad7d15f19121249d3ff42885e3f01857", "chainId": 56, "blockHash": "0x90c812fe8bf9226d4c695e009587ccad9aa9eca6b32683987a971057e51ecb0a", "blockNumber": 129848976, "expectedUSDTraw": "-100000000000000000000", "expectedBNBraw": "134744030385285348", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u6838\u5B9E\u6210\u529F\u8C03\u7528\uFF1AUSDT\u7ECF\u8DEF\u7531\u5151\u6362\u4E3AWBNB\uFF0C\u518D\u89E3\u5305\u6210\u540C\u91CFBNB\u56DE\u5230\u672C\u94B1\u5305\uFF1B\u8DEF\u7531\u7559\u5B58\u5DF2\u5305\u542B\u5728USDT\u51C0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u53E6\u6263\u3002\u4E0D\u6D89\u53CAESIM\u4E70\u5356\u6216LP\u3002", "evidence": [{ "receiptSHA256": "1bdf4e9fb0c9f4573645e48612308c78ae6f76b1b32ec6d323e4946df76f453e", "traceSHA256": "05a741c050d9c59c261336a602d0bc13dc8608b664bd589777966dfdc52a7cea", "receiptStatus": "0x1", "wrappedBNBOutputRaw": "134744030385285348", "nativeReceivedRaw": "134744030385285348", "walletUSDTDeltaRaw": "-100000000000000000000", "source": "block-pinned receipt and successful callTracer", "transactionURL": "https://bscscan.com/tx/0x1ba2a80b460102036e7a58dfe8b2f13ac246fa5f9ea6ab3d87d11d4628fae9fb" }] }, { "hash": "0x0463393fd28f0277429e48de7f431038f6e7f55b0a630a4472ab35fd7aed26cb", "wallet": "0x5a0a1cde682222f1c137eb95957c7461c6f6e379", "chainId": 56, "blockHash": "0x2fad25d511d623bea35592807a034f54614dd6a1609b01de27ee4f11a3c83090", "blockNumber": 129855691, "expectedUSDTraw": "-5000000000000000000", "expectedBNBraw": "6745537080424382", "type": "\u975EESIM\u5151\u6362", "reason": "\u5DF2\u6838\u5B9E\u6210\u529F\u8C03\u7528\uFF1AUSDT\u7ECF\u8DEF\u7531\u5151\u6362\u4E3AWBNB\uFF0C\u518D\u89E3\u5305\u6210\u540C\u91CFBNB\u56DE\u5230\u672C\u94B1\u5305\uFF1B\u8DEF\u7531\u7559\u5B58\u5DF2\u5305\u542B\u5728USDT\u51C0\u4ED8\u51FA\u5185\uFF0C\u4E0D\u53E6\u6263\u3002\u4E0D\u6D89\u53CAESIM\u4E70\u5356\u6216LP\u3002", "evidence": [{ "receiptSHA256": "54ccf42bc5614c25aa559d5773c1c2ea472c8ef50a0d5408d2f8360c21d65dd4", "traceSHA256": "90264bd082cebe78803371ca9f7a13ee5cbf0c51e69421ba47a9020d9fe71a4c", "receiptStatus": "0x1", "wrappedBNBOutputRaw": "6745537080424382", "nativeReceivedRaw": "6745537080424382", "walletUSDTDeltaRaw": "-5000000000000000000", "source": "block-pinned receipt and successful callTracer", "transactionURL": "https://bscscan.com/tx/0x0463393fd28f0277429e48de7f431038f6e7f55b0a630a4472ab35fd7aed26cb" }] }]);
      const sourceTrim = esimTrimRpc;
      esimTrimRpc = function(method, result) {
        const value = sourceTrim(method, result);
        if (method === "eth_getTransactionReceipt") {
          const transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", keptContracts = /* @__PURE__ */ new Set([ESIM_CFG.token, ESIM_CFG.usdt, "0x55f4c8aba71a1e923edc303eb4feff14608cc226", "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364"]);
          value.logs = value.logs.filter((log) => {
            if (log.topics[0] !== transfer) return true;
            return keptContracts.has(String(log.address).toLowerCase());
          });
        }
        return value;
      };
      return { get config() {
        return ESIM_CFG;
      }, set config(v) {
        ESIM_CFG = v;
      }, step: esimCollectStep, trim: esimTrimRpc, verify: esimAssertPublishable, view: esimBuildView, external: esimExternalRows, owners: esimNftOwners, serial: esimSerial, unit: esimUnit, hex: esimHex, setRPC(fn) {
        esimRpcMany = fn;
        esimRpc = (m, p) => fn([[m, p]])[0];
        esimBudget = () => {
        };
      }, setJob(j) {
        ESIM_JOB = j;
      } };
    };
  }
});

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/collector.js
import { createHash as createHash4 } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/pg/esm/index.mjs
var import_lib = __toESM(require_lib2(), 1);
var Client = import_lib.default.Client;
var Pool = import_lib.default.Pool;
var Connection = import_lib.default.Connection;
var types = import_lib.default.types;
var Query = import_lib.default.Query;
var DatabaseError = import_lib.default.DatabaseError;
var escapeIdentifier = import_lib.default.escapeIdentifier;
var escapeLiteral = import_lib.default.escapeLiteral;
var Result = import_lib.default.Result;
var TypeOverrides = import_lib.default.TypeOverrides;
var defaults = import_lib.default.defaults;
var esm_default = import_lib.default;

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/db.js
var import_functions = __toESM(require_functions(), 1);
esm_default.types.setTypeParser(1082, (v) => v);
var cache = globalThis;
function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  if (!cache.esimPool) {
    const url = new URL(process.env.DATABASE_URL);
    if (url.searchParams.get("sslmode") === "require") url.searchParams.set("sslmode", "verify-full");
    cache.esimPool = new esm_default.Pool({ connectionString: url.toString(), max: 4, idleTimeoutMillis: 15e3, connectionTimeoutMillis: 15e3, application_name: "esim-ledger" });
    cache.esimPool.on("error", (e) => console.error("database-idle-connection", e.code || "disconnected"));
    (0, import_functions.attachDatabasePool)(cache.esimPool);
  }
  return cache.esimPool;
}
async function transaction(fn) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const c = await db().connect();
    let broken = false;
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      broken = ["ECONNRESET", "ETIMEDOUT", "57P01", "08006"].includes(e.code) || /connection (?:terminated|closed)|server closed the connection/i.test(e.message || "");
      try {
        await c.query("ROLLBACK");
      } catch {
      }
      if (!broken || attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    } finally {
      c.release(broken);
    }
  }
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/rpc.js
import { createHash as createHash2 } from "node:crypto";

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/sync-plan.js
import { createHash } from "node:crypto";
var DEFAULT_START = "2026-09-30";
function validStartDay(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day + "T00:00:00Z")) || (/* @__PURE__ */ new Date(day + "T00:00:00Z")).toISOString().slice(0, 10) !== day || day < DEFAULT_START) throw Error("\u5730\u5740\u7EDF\u8BA1\u8D77\u59CB\u65E5\u671F\u65E0\u6548");
  return day;
}
function activeAddresses(addresses, day) {
  return addresses.filter((a) => typeof a === "string" || (a.active_from || DEFAULT_START) <= day);
}
function collectionScope(addresses, day) {
  const active = activeAddresses(addresses, day);
  return { addresses: active.map((x) => typeof x === "string" ? x : x.address), wallets: active.filter((a) => typeof a === "string" || a.mode === "wallet").map((a) => typeof a === "string" ? a : a.address), balanceOnly: active.filter((a) => typeof a !== "string" && a.mode !== "wallet").map((a) => a.address), cohortHash: cohortHash(active) };
}
function cohortHash(addresses) {
  const entries = /* @__PURE__ */ new Map();
  for (const value of addresses) {
    const address2 = (typeof value === "string" ? value : value.address).toLowerCase(), mode = typeof value === "string" ? "wallet" : value.mode || "wallet";
    if (!["wallet", "robot", "balance_only"].includes(mode)) throw Error("\u5730\u5740\u91C7\u96C6\u6A21\u5F0F\u65E0\u6548");
    const start = validStartDay(typeof value === "string" ? DEFAULT_START : value.active_from || DEFAULT_START), identity = mode + (start === DEFAULT_START ? "" : "@" + start);
    if (entries.has(address2) && entries.get(address2) !== identity) throw Error("\u540C\u4E00\u5730\u5740\u7684\u91C7\u96C6\u6A21\u5F0F\u51B2\u7A81\u6216\u8D77\u59CB\u65E5\u671F\u51B2\u7A81");
    entries.set(address2, identity);
  }
  return "v2:" + createHash("sha256").update(JSON.stringify([...entries].sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
}
var plus = (day, n) => new Date(Date.parse(day + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
function buildSyncPlan(addresses, periods, { now = /* @__PURE__ */ new Date(), source = "automatic", start = "2026-09-30" } = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw Error("\u7EDF\u8BA1\u65E5\u671F\u65E0\u6548");
  const today = now.toISOString().slice(0, 10), stamp = Date.parse(start + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== start || start > today) throw Error("\u7EDF\u8BA1\u5F00\u59CB\u65E5\u671F\u65E0\u6548");
  const hash2 = cohortHash(addresses), known = new Map(periods.map((p) => [p.day, p])), plan = [];
  for (let day = start; day < today; day = plus(day, 1)) {
    const p = known.get(day);
    if (!p || p.status !== "complete" || p.cohort_hash !== cohortHash(activeAddresses(addresses, day))) plan.push({ day, partial: false });
  }
  const pending = addresses.some((a) => a.backfill_pending);
  if ((source === "manual" || source === "backfill" || source === "server" || pending) && now.getTime() > Date.parse(today + "T00:00:00Z") + 65e3)
    plan.push({ day: today, partial: true, end: new Date(now.getTime() - 65e3).toISOString() });
  return { plan, hash: hash2 };
}
function requestedRangeCovered(plan, catalog, periods) {
  return plan.every((p) => {
    const v = periods.find((v2) => v2.day === p.day), end = Date.parse(p.partial ? p.end : p.day + "T00:00:00Z") + (p.partial ? 0 : 864e5);
    return v && ["complete", "in_progress"].includes(v.status) && v.cohort_hash === collectionScope(catalog, p.day).cohortHash && (p.partial || v.status === "complete") && Number.isFinite(end) && Number.isFinite(new Date(v.end_at).getTime()) && new Date(v.end_at).getTime() >= end;
  });
}
function extendSyncPlan(plan, addresses, periods, options = {}) {
  const last = plan.at(-1)?.day;
  if (!last) return plan;
  return plan.concat(buildSyncPlan(addresses, periods, options).plan.filter((p) => p.day > last));
}
function closeElapsedPartialDays(state, now = /* @__PURE__ */ new Date()) {
  const today = now.toISOString().slice(0, 10);
  let changed = false;
  for (let i = 0; i < state.plan.length; i++) {
    const day = state.plan[i];
    if (!day.partial || day.day >= today) continue;
    day.partial = false;
    delete day.end;
    changed = true;
    if (i <= state.index) {
      state.index = i;
      state.wallet = null;
      state.cache = {};
    }
  }
  return changed;
}
var isBoundaryPending = (error) => error?.code === "ESIM_YIELD" || error?.message === "\u7EDF\u8BA1\u7ED3\u675F\u533A\u5757\u5C1A\u672A\u786E\u8BA4\uFF0C\u4E0B\u6B21\u81EA\u52A8\u7EE7\u7EED";
function isTransientSyncError(error) {
  if (error?.contractRevert) return false;
  if (["CU_BUDGET_DEFERRED", "CU_METER_UNAVAILABLE"].includes(error?.code || error?.message)) return true;
  return isBoundaryPending(error) || ["TimeoutError", "AbortError"].includes(error?.name) || [429, -32005].includes(error?.code) || /timeout|timed out|operation was aborted|fetch failed|ECONNRESET|ETIMEDOUT|链上接口暂不可用|Internal error/i.test(error?.message || "");
}
function canResumeFailed(run, hash2, now = /* @__PURE__ */ new Date()) {
  const state = run?.state, count = Number(state?.retryCount ?? 0), after = state?.retryAfter === void 0 ? 0 : Date.parse(state.retryAfter);
  return state?.cohortHash === hash2 && Number.isInteger(count) && count >= 0 && (count < 8 || isBoundaryPending({ message: run.error }) || state?.retryable === true && state?.retryAfter !== void 0 && isTransientSyncError({ message: run.error, code: state.retryErrorCode })) && Number.isFinite(after) && after <= now.getTime() && (run.state.retryable === true || isTransientSyncError({ message: run.error }));
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/vendor/cu-budget.mjs
import { randomUUID } from "node:crypto";
var CU_COSTS = Object.freeze({
  eth_chainId: 0,
  net_version: 0,
  eth_blockNumber: 10,
  eth_getBlockByNumber: 20,
  eth_getBlockByHash: 20,
  eth_getBalance: 20,
  eth_getCode: 20,
  eth_getStorageAt: 20,
  eth_getTransactionCount: 20,
  eth_getTransactionByHash: 20,
  eth_getTransactionReceipt: 20,
  eth_getBlockReceipts: 20,
  web3_sha3: 20,
  eth_call: 26,
  eth_getLogs: 60,
  alchemy_getAssetTransfers: 120,
  trace_filter: 40,
  trace_transaction: 40,
  debug_traceTransaction: 40,
  getNFTsForOwner: 480
});
function quoteCu(methods) {
  const counts = {};
  let units = 0;
  for (const method of methods) {
    if (!Object.hasOwn(CU_COSTS, method)) throw Error("CU_UNKNOWN_METHOD");
    counts[method] = (counts[method] || 0) + 1;
    units += CU_COSTS[method];
  }
  return { units, counts, calls: methods.length };
}
function createCuMeter({
  mode = "off",
  task = "unassigned",
  query,
  limit = 3e6,
  reserve = 4e5,
  timeoutMs = 3e3,
  warning = () => {
  }
} = {}) {
  if (!["off", "observe", "enforce"].includes(mode) || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(reserve) || reserve < 0 || reserve > limit || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 1e4 || !/^[-a-z0-9_]{1,40}$/.test(task)) throw Error("CU_INVALID_CONFIG");
  const stats = { estimatedCu: 0, unpersistedCu: 0, attemptedCalls: 0, attempts: 0, byMethod: {} };
  let unavailableUntil = 0;
  async function charge(methods) {
    const quote = quoteCu(methods);
    let unpersisted = mode === "observe" && Date.now() < unavailableUntil;
    if (mode !== "off" && !unpersisted) {
      let timer;
      try {
        if (typeof query !== "function") throw Error("CU_METER_UNAVAILABLE");
        const result = await Promise.race([
          query(
            "SELECT * FROM esim_ledger.reserve_rpc_cu($1,$2,$3,$4,$5,$6,$7,$8)",
            [randomUUID(), task, quote.units, quote.calls, JSON.stringify(quote.counts), mode, limit, reserve]
          ),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(Error("CU_METER_UNAVAILABLE")), timeoutMs);
          })
        ]);
        const row = (result.rows || result)[0];
        if (row?.admitted !== true) {
          const e = Error("CU_BUDGET_DEFERRED");
          e.code = e.message;
          e.retryAt = Number(row?.retry_at_ms);
          throw e;
        }
      } catch (error) {
        if (error.message === "CU_BUDGET_DEFERRED" || mode === "enforce") throw error.message === "CU_BUDGET_DEFERRED" ? error : Error("CU_METER_UNAVAILABLE");
        unavailableUntil = Date.now() + 6e4;
        unpersisted = true;
        warning({ phase: "cu-meter-unavailable", task });
      } finally {
        clearTimeout(timer);
      }
    }
    if (unpersisted) stats.unpersistedCu += quote.units;
    stats.estimatedCu += quote.units;
    stats.attemptedCalls += quote.calls;
    stats.attempts++;
    for (const [method, count] of Object.entries(quote.counts)) stats.byMethod[method] = (stats.byMethod[method] || 0) + count;
    return quote;
  }
  function wrapFetch(request, { method } = {}) {
    return async (url, options) => {
      const body = method ? null : JSON.parse(options?.body);
      const methods = method ? [method] : (Array.isArray(body) ? body : [body]).map((c) => c.method);
      await charge(methods);
      return request(url, options);
    };
  }
  return { stats, charge, wrapFetch };
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/node_modules/viem/_esm/index.js
init_exports();
init_decodeFunctionResult();
init_encodeFunctionData();
init_keccak256();

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/balance-multicall.js
var MULTICALL = { address: "0xca11bde05977b3631167028862be2a173976ca11", hash: "0xd5c15df687b16f2ff992fc8d767b4216323184a2bbc6ee2f9c398c318e770891" };
var IMPL = { address: "0xa936365df925adbcd0746cc4554ad5c230ece97d", hash: "0x4acb3cb6eb3ec59502958f44acea63fa0dd4d77f99c0d3c249450773f933dfd5" };
var SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
var TOKEN = "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d";
var TARGETS = {
  [TOKEN]: "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
  "0x55d398326f99059ff775485246999027b3197955": "0x97a48aa4c129657440dafdacd4c836389734d28cc4a0ca7403e68da660a74a59",
  "0x55f4c8aba71a1e923edc303eb4feff14608cc226": "0xe8fea1721cd1cb164280e02614b06d7d8033dcc81ed6fa97f5e7cc63341d34ed",
  "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364": "0xf64dd82357e77afddcd6dd56f4ba161f44fe90a6f72da5433f8fc6901440197f"
};
var ABI = parseAbi(["function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)"]);
var validCode = (v) => typeof v === "string" && /^0x(?:[0-9a-f]{2})+$/i.test(v);
function tuple(v) {
  return Array.isArray(v) && Object.getPrototypeOf(v) === Array.prototype && v.length === 2 && !("toJSON" in v) && [0, 1].every((k) => Object.hasOwn(Object.getOwnPropertyDescriptor(v, k) || {}, "value"));
}
function balanceCall(q) {
  if (!tuple(q) || q[0] !== "eth_call" || !tuple(q[1])) return false;
  const [tx, block] = q[1], proto = tx && Object.getPrototypeOf(tx);
  if (!tx || ![Object.prototype, null].includes(proto) || "toJSON" in tx || Reflect.ownKeys(tx).length !== 2) return false;
  for (const k of ["to", "data"]) {
    const d = Object.getOwnPropertyDescriptor(tx, k);
    if (!d?.enumerable || !Object.hasOwn(d, "value")) return false;
  }
  return typeof block === "string" && /^0x[0-9a-f]+$/i.test(block) && BigInt(block) >= 15921452n && typeof tx.to === "string" && Object.hasOwn(TARGETS, tx.to.toLowerCase()) && typeof tx.data === "string" && /^0x70a082310{24}[0-9a-f]{40}$/i.test(tx.data);
}
async function fillBalanceMulticall(calls, read) {
  const groups = /* @__PURE__ */ new Map(), results = [];
  for (const q of calls) if (balanceCall(q)) {
    const block = q[1][1].toLowerCase();
    if (!groups.has(block)) groups.set(block, []);
    groups.get(block).push(q);
  }
  for (const [block, group] of groups) {
    if (group.length < 12) continue;
    const [chain, header] = await read([["eth_chainId", []], ["eth_getBlockByNumber", [block, false]]]);
    if (chain !== "0x38") throw Object.assign(Error("\u4F59\u989D\u6279\u91CF\u8BFB\u53D6\u7684\u7F51\u7EDC\u4E0D\u662FBNB Smart Chain"), { code: "BSC_CHAIN_MISMATCH" });
    if (!/^0x[0-9a-f]{64}$/i.test(header?.hash || "") || !/^0x[0-9a-f]+$/i.test(header?.number || "") || BigInt(header.number) !== BigInt(block)) continue;
    const at = { blockHash: header.hash, requireCanonical: true }, targets = [...new Set(group.map((q) => q[1][0].to.toLowerCase()))];
    const guards = [["eth_getCode", [MULTICALL.address, at]], ...targets.map((t) => ["eth_getCode", [t, at]])];
    if (targets.includes(TOKEN)) guards.push(["eth_getStorageAt", [TOKEN, SLOT, at]], ["eth_getCode", [IMPL.address, at]]);
    let values;
    try {
      values = await read(guards);
    } catch (e) {
      if (e.code === -32602) continue;
      throw e;
    }
    if (values.length !== guards.length) throw Error("\u4F59\u989D\u6279\u91CF\u8BFB\u53D6\u7684\u4EE3\u7801\u6838\u9A8C\u4E0D\u5B8C\u6574");
    if (!validCode(values[0]) || keccak256(values[0]) !== MULTICALL.hash) continue;
    const safe = new Set(targets.filter((t, i) => validCode(values[i + 1]) && keccak256(values[i + 1]) === TARGETS[t]));
    if (targets.includes(TOKEN) && (values.at(-2) !== "0x" + "0".repeat(24) + IMPL.address.slice(2) || !validCode(values.at(-1)) || keccak256(values.at(-1)) !== IMPL.hash)) safe.delete(TOKEN);
    const eligible = group.filter((q) => safe.has(q[1][0].to.toLowerCase()));
    if (eligible.length < 12) continue;
    const staged = [];
    for (let i = 0; i < eligible.length; i += 400) {
      const batch = eligible.slice(i, i + 400), data = encodeFunctionData({ abi: ABI, functionName: "aggregate3", args: [batch.map((q) => ({ target: q[1][0].to.toLowerCase(), allowFailure: true, callData: q[1][0].data }))] });
      let encoded;
      try {
        [encoded] = await read([["eth_call", [{ to: MULTICALL.address, data }, at]]]);
      } catch (e) {
        if (e.contractRevert || e.code === -32602) continue;
        throw e;
      }
      let decoded;
      try {
        decoded = decodeFunctionResult({ abi: ABI, functionName: "aggregate3", data: encoded });
      } catch {
        continue;
      }
      if (decoded.length !== batch.length || decoded.some((x) => !x.success || !/^0x[0-9a-f]{64}$/i.test(x.returnData))) continue;
      staged.push(...batch.map((q, i2) => [q, decoded[i2].returnData]));
    }
    results.push(...staged);
  }
  return results;
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/rpc.js
var meter = createCuMeter({ mode: process.env.ESIM_CU_MODE || "off", task: process.env.ESIM_CU_TASK || "mm", query: (...args) => db().query(...args), warning: (e) => console.warn(JSON.stringify(e)) });
var NeedRpc = class extends Error {
  constructor(calls) {
    super("NEED_RPC");
    this.calls = calls;
  }
};
var fixedRead = (q) => q[0] !== "eth_blockNumber" && !/"(?:latest|pending|safe|finalized)"/.test(JSON.stringify(q[1]));
var key = (q) => createHash2("sha256").update("56:" + JSON.stringify(q)).digest("hex");
var allowed = /* @__PURE__ */ new Set(["eth_chainId", "eth_getCode", "eth_getStorageAt", "eth_getBlockByNumber", "eth_getBalance", "eth_getTransactionCount", "eth_call", "eth_getLogs", "eth_getTransactionByHash", "eth_getTransactionReceipt", "alchemy_getAssetTransfers", "web3_sha3", "debug_traceTransaction", "trace_filter"]);
function batchPlan(calls) {
  const heavy = calls.some((q) => ["eth_getTransactionReceipt", "debug_traceTransaction"].includes(q[0]) || q[0] === "eth_getBlockByNumber" && q[1][1] === true), size2 = heavy ? 8 : 30, chunks = [];
  for (let i = 0; i < calls.length; i += size2) chunks.push(calls.slice(i, i + size2));
  return { chunks, concurrency: heavy ? 1 : 3 };
}
async function storeRecords(records) {
  if (records.length) await db().query("INSERT INTO esim_ledger.rpc_cache(key,method,result) SELECT x.key,x.method,x.result FROM jsonb_to_recordset($1::jsonb) AS x(key text,method text,result jsonb) ON CONFLICT(key)DO UPDATE SET result=excluded.result,created_at=now()", [JSON.stringify(records.map((r) => ({ key: r[0], method: r[1], result: JSON.parse(r[2]) })))]);
}
async function fill(calls, cache2, trim2 = (m, x) => x, { fresh = false } = {}) {
  const destination = cache2;
  if (fresh) cache2 = {};
  const qs = [...new Map(calls.map((q) => [key(q), q])).values()];
  for (const q of qs) if (!allowed.has(q[0])) throw Error("\u53EA\u5141\u8BB8\u8BFB\u53D6\u94FE\u4E0A\u6570\u636E");
  const absent = qs.filter((q) => cache2[key(q)] === void 0), persistent = fresh ? [] : absent.filter((q) => fixedRead(q));
  for (const group of batchPlan(persistent).chunks) {
    const old = (await db().query("SELECT key,method,result FROM esim_ledger.rpc_cache WHERE key=ANY($1::text[]) AND created_at>=(SELECT valid_after FROM esim_ledger.rpc_cache_epoch WHERE id=1) AND (method NOT IN ('alchemy_getAssetTransfers','eth_getLogs') OR created_at>now()-interval '1 hour')", [group.map(key)])).rows;
    for (const x of old) cache2[x.key] = trim2(x.method, x.result);
  }
  for (const q of absent) {
    const filter = q[0] === "eth_getLogs" && q[1][0];
    if (cache2[key(q)] !== void 0 || !/^0x[0-9a-f]+$/i.test(filter?.fromBlock || "") || !/^0x[0-9a-f]+$/i.test(filter?.toBlock || "")) continue;
    const start = BigInt(filter.fromBlock), end = BigInt(filter.toBlock);
    if (end - start < 5000n) continue;
    const parts = [];
    for (let lo = start; lo <= end; lo += 5000n) parts.push(["eth_getLogs", [{ ...filter, fromBlock: "0x" + lo.toString(16), toBlock: "0x" + (lo + 4999n < end ? lo + 4999n : end).toString(16) }]]);
    await fill(parts, cache2, trim2, { fresh });
    cache2[key(q)] = parts.flatMap((part) => cache2[key(part)]);
  }
  if (!fresh) {
    const combined = await fillBalanceMulticall(absent.filter((q) => cache2[key(q)] === void 0), freshBatch), records = [];
    for (const [q, value] of combined) {
      cache2[key(q)] = trim2(q[0], value);
      records.push([key(q), q[0], JSON.stringify(value)]);
    }
    await storeRecords(records);
  }
  const missing = absent.filter((q) => cache2[key(q)] === void 0), { chunks, concurrency } = batchPlan(missing);
  async function worker() {
    while (chunks.length) {
      const batch = chunks.shift();
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        await meter.charge(batch.map((q) => q[0]));
        try {
          const result = await fetch(process.env.BNB_RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch.map((q, i) => ({ jsonrpc: "2.0", id: i, method: q[0], params: q[1] }))), signal: AbortSignal.timeout(25e3) });
          if (!result.ok) throw Error("\u94FE\u4E0A\u63A5\u53E3\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u7EE7\u7EED");
          response = await result.json();
          if (!Array.isArray(response)) throw Error("\u94FE\u4E0A\u6279\u91CF\u6570\u636E\u4E0D\u5B8C\u6574");
          if (response.some((r) => r.error && isTransientSyncError(r.error)) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            continue;
          }
          break;
        } catch (e) {
          if (attempt === 2 || !isTransientSyncError(e)) throw e;
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      const records = [];
      for (let i = 0; i < batch.length; i++) {
        const r = response.find((r2) => r2.id === i), q = batch[i];
        if (r?.error) {
          const detail = String(r.error.message || "").replace(/https?:\/\/\S+/g, "[\u63A5\u53E3]").slice(0, 120), e = new Error("\u94FE\u4E0A\u8BFB\u53D6\u5931\u8D25\uFF1A" + q[0] + " (" + r.error.code + ") " + detail);
          e.code = r.error.code;
          e.contractRevert = /execution reverted/i.test(r.error.message || "");
          throw e;
        }
        if (!r || r.result == null) throw Error("\u94FE\u4E0A\u6570\u636E\u7F3A\u5931\uFF1A" + q[0]);
        const value = trim2(q[0], r.result);
        cache2[key(q)] = value;
        if (!fresh && fixedRead(q)) records.push([key(q), q[0], JSON.stringify(r.result)]);
      }
      await storeRecords(records);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, worker));
  if (fresh) Object.assign(destination, cache2);
}
async function freshBatch(calls) {
  const cache2 = {};
  await fill(calls, cache2, void 0, { fresh: true });
  return calls.map((q) => cache2[key(q)]);
}
function reader(cache2) {
  return (calls) => {
    const missing = calls.filter((q) => cache2[key(q)] === void 0);
    if (missing.length) throw new NeedRpc(missing);
    return calls.map((q) => cache2[key(q)]);
  };
}
async function rpc(method, params, cache2 = {}, trim2 = (m, x) => x) {
  const q = [method, params];
  await fill([q], cache2, trim2);
  return cache2[key(q)];
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/write-snapshot.js
async function insertRows(c, table, columns, rows) {
  for (let i = 0; i < rows.length; i += 150) {
    const chunk = rows.slice(i, i + 150), values = chunk.flat(), sql = chunk.map((r, j) => "(" + r.map((_, k) => "$" + (j * r.length + k + 1)).join(",") + ")").join(",");
    await c.query(`INSERT INTO esim_ledger.${table}(${columns.join(",")})VALUES${sql}`, values);
  }
}
async function publish(snapshot2, lease) {
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(7693201)");
    if (lease && !(await c.query("SELECT 1 FROM esim_ledger.sync_runs WHERE id=$1 AND lease_version=$2 AND lease_until>now() FOR UPDATE", [lease.id, lease.version])).rowCount) throw Error("SYNC_LEASE_LOST");
    const addresses = activeAddresses((await c.query("SELECT address,mode,active_from FROM esim_ledger.addresses ORDER BY ordinal")).rows, snapshot2.day);
    if (cohortHash(addresses) !== snapshot2.cohortHash || cohortHash(addresses.map((r) => r.address)) !== cohortHash(snapshot2.addresses)) throw Error("\u5730\u5740\u5E93\u5DF2\u53D8\u5316\uFF0C\u672C\u8F6E\u7ED3\u679C\u4E0D\u53D1\u5E03\uFF0C\u8BF7\u91CD\u65B0\u66F4\u65B0");
    const old = (await c.query("SELECT end_at FROM esim_ledger.periods WHERE day=$1 FOR UPDATE", [snapshot2.day])).rows[0];
    if (old && new Date(old.end_at) > new Date(snapshot2.end)) throw Error("\u5DF2\u6709\u66F4\u665A\u6570\u636E\uFF0C\u672C\u8F6E\u4E0D\u80FD\u8986\u76D6");
    await c.query("INSERT INTO esim_ledger.periods(day,start_at,end_at,status,start_block,end_block,close_price,cohort_hash,source_hash,verified_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now())ON CONFLICT(day)DO UPDATE SET start_at=excluded.start_at,end_at=excluded.end_at,status=excluded.status,start_block=excluded.start_block,end_block=excluded.end_block,close_price=excluded.close_price,cohort_hash=excluded.cohort_hash,source_hash=excluded.source_hash,verified_at=now()", [snapshot2.day, snapshot2.start, snapshot2.end, snapshot2.partial ? "in_progress" : "complete", snapshot2.startBlock, snapshot2.endBlock, snapshot2.price, snapshot2.cohortHash, snapshot2.hash]);
    await c.query("DELETE FROM esim_ledger.positions WHERE day=$1", [snapshot2.day]);
    await c.query("DELETE FROM esim_ledger.external_transfers WHERE day=$1", [snapshot2.day]);
    await insertRows(c, "positions", ["day", "address", "asset", "opening", "buy", "sell", "lp_in", "lp_out", "lp_fee", "external_in", "external_out", "internal_net", "other_net", "gas", "closing", "opening_lp", "closing_lp", "robot_net", "note"], snapshot2.positions);
    await insertRows(c, "external_transfers", ["hash", "log_index", "day", "occurred_at", "sender", "recipient", "asset", "amount", "raw_amount"], snapshot2.external);
    const bad = (await c.query("SELECT count(*) AS n FROM esim_ledger.external_transfers e JOIN esim_ledger.addresses a ON a.address=e.recipient AND a.active_from<=e.day WHERE e.day=$1", [snapshot2.day])).rows[0];
    if (Number(bad.n)) throw Error("\u5185\u90E8\u8F6C\u8D26\u9519\u8BEF\u8FDB\u5165\u5BF9\u5916\u8F6C\u8D26\uFF0C\u505C\u6B62\u53D1\u5E03");
    const mismatch = (await c.query(`WITH a AS(SELECT address,asset,external_out n FROM esim_ledger.positions WHERE day=$1 AND asset IN('ESIM','USDT')),b AS(SELECT sender address,asset,sum(amount)n FROM esim_ledger.external_transfers WHERE day=$1 GROUP BY sender,asset) SELECT count(*) n FROM a FULL JOIN b USING(address,asset) WHERE abs(coalesce(a.n,0)-coalesce(b.n,0))>0.0000001`, [snapshot2.day])).rows[0];
    if (Number(mismatch.n)) throw Error("\u5BF9\u5916\u8F6C\u51FA\u6C47\u603B\u4E0E\u51ED\u8BC1\u660E\u7EC6\u4E0D\u4E00\u81F4\uFF0C\u505C\u6B62\u53D1\u5E03");
    await c.query("INSERT INTO esim_ledger.evidence(day,source,source_hash)VALUES($1,$2,$3)ON CONFLICT(day)DO UPDATE SET source=excluded.source,source_hash=excluded.source_hash", [snapshot2.day, JSON.stringify(snapshot2.proof), snapshot2.hash]);
    if (!snapshot2.partial) await c.query("INSERT INTO esim_ledger.snapshot_history(day,source_hash,end_block,cohort_hash,summary) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [snapshot2.day, snapshot2.hash, snapshot2.endBlock, snapshot2.cohortHash, JSON.stringify({ start: snapshot2.start, end: snapshot2.end, partial: snapshot2.partial, price: snapshot2.price, positionColumns: ["day", "address", "asset", "opening", "buy", "sell", "lp_in", "lp_out", "lp_fee", "external_in", "external_out", "internal_net", "other_net", "gas", "closing", "opening_lp", "closing_lp", "robot_net", "note"], positions: snapshot2.positions, proof: snapshot2.proof })]);
    return snapshot2.day;
  });
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/verified-exchange.js
import { createHash as createHash3 } from "node:crypto";
var ENTRY = "0x07964f135f276412b3182a3b2407b8dd45000000";
var U = "0x55d398326f99059ff775485246999027b3197955";
var W = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
var TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
var WITHDRAW = "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65";
var addr = (t) => "0x" + t.slice(-40).toLowerCase();
var sha = (x) => createHash3("sha256").update(JSON.stringify(x)).digest("hex");
var ROUTER_SWAP = "0x2251435bd151cd72851a82be055bf6d1c3d7f34d08d56493dddf874229b8e897";
function verifyGasExchange({ wallet, esim, tx, receipt, trace }) {
  try {
    let walk2 = function(x) {
      if (x.error) return;
      if (x.type === "CALL" && x.from === wallet && x.to === ENTRY) routed = true;
      if (["CALL", "CREATE", "CREATE2", "SELFDESTRUCT"].includes(x.type)) {
        const n = BigInt(x.value || "0x0");
        if (x.to === wallet) native += n;
        if (x.from === wallet) native -= n;
        if (x.from === W && owners.has(x.to)) unwrapped += n;
      }
      if (x.to === W && owners.has(x.from) && /^0x2e1a7d4d[0-9a-f]{64}$/.test(x.input || "")) called += BigInt("0x" + x.input.slice(10));
      for (const child of x.calls || []) walk2(child);
    };
    if (!tx || !receipt || !trace || receipt.status !== "0x1" || tx.from !== wallet || ![ENTRY, wallet].includes(tx.to) || trace.from !== wallet || trace.to !== tx.to || trace.error || receipt.transactionHash !== tx.hash || !/^0x[0-9a-f]{64}$/.test(receipt.blockHash)) return null;
    let debit = 0n, withdrawn = 0n, native = 0n, called = 0n, unwrapped = 0n, routed = false;
    const owners = /* @__PURE__ */ new Set(), swaps = [];
    for (const l of receipt.logs) {
      if (l.removed) return null;
      const t = l.topics || [];
      if (t[0] === TRANSFER && t.length >= 3) {
        const from = addr(t[1]), to = addr(t[2]), n = BigInt(l.data);
        if (l.address === esim && n && (from === wallet || to === wallet)) return null;
        if (l.address === U) {
          if (to === wallet && n) return null;
          if (from === wallet) {
            if (to !== ENTRY) return null;
            debit += n;
          }
        }
      }
      if (l.address === W && t[0] === WITHDRAW && t.length === 2) {
        withdrawn += BigInt(l.data);
        owners.add(addr(t[1]));
      }
      if (l.address === ENTRY && t[0] === ROUTER_SWAP && t.length === 4 && addr(t[1]) === U && addr(t[2]) === "0x" + "0".repeat(40) && addr(t[3]) === wallet && /^0x[0-9a-f]{128,}$/.test(l.data)) swaps.push([BigInt("0x" + l.data.slice(2, 66)), BigInt("0x" + l.data.slice(66, 130))]);
    }
    walk2(trace);
    const wrapped = withdrawn > 0n && withdrawn === native && withdrawn === called && withdrawn === unwrapped;
    const direct = swaps.length === 1 && swaps[0][0] === debit && swaps[0][1] === native && routed && BigInt(tx.value || "0x0") === 0n;
    if (debit <= 0n || native <= 0n || !wrapped && !direct) return null;
    return { hash: tx.hash, wallet, chainId: 56, blockHash: receipt.blockHash, blockNumber: Number(BigInt(receipt.blockNumber)), expectedUSDTraw: String(-debit), expectedBNBraw: String(native), type: "\u975EESIM\u5151\u6362", reason: "\u5DF2\u6838\u5BF9\u6210\u529F\u56DE\u6267\u3001USDT\u652F\u51FA\u3001\u8DEF\u7531\u5151\u6362\u6216WBNB\u64A4\u56DE\u4E8B\u4EF6\uFF0C\u4EE5\u53CABNB\u8FD4\u56DE\u94B1\u5305\u7684\u6210\u529F\u8C03\u7528\u8DEF\u5F84\uFF1B\u5C5E\u4E8EUSDT\u6362BNB\uFF0C\u4E0D\u662FESIM\u4E70\u5356\u6216\u8D44\u91D1\u8F6C\u5165\u3002\u8DEF\u7531\u8D39\u7528\u5305\u542B\u5728USDT\u603B\u652F\u51FA\u5185\uFF0CGas\u53E6\u8BA1\u3002", evidence: [{ source: "captured-raw-rpc", methods: ["eth_getTransactionByHash", "eth_getTransactionReceipt", "debug_traceTransaction"], receiptSHA256: sha(receipt), traceSHA256: sha(trace), grossUSDTraw: String(debit), receivedBNBraw: String(native), directNativeRoute: direct, scope: "Exact transaction, wallet, block and raw amounts; one configured RPC provider." }] };
  } catch {
    return null;
  }
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/transfer-fees.js
var TRANSFER2 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
var USEROP = "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f";
var ENTRY2 = "0x4337084d9e255ff0702461cf8895ce9e3b5ff108";
var address = (t) => "0x" + String(t).slice(-40).toLowerCase();
function verifiedTransferFees(result, receipts, usdt) {
  const contexts = new Map(result.transactions.map((t) => [t.hash + "|" + t.wallet, t])), seen = /* @__PURE__ */ new Set(), fees = [];
  for (const f of result.flows) {
    if (f.asset !== "USDT" || contexts.get(f.hash + "|" + f.from)?.type !== "\u5916\u90E8\u8F6C\u8D26") continue;
    const r = receipts[f.hash];
    if (!r || BigInt(r.status || 0) !== 1n || r.transactionHash !== f.hash) continue;
    const logs = r.logs || [], matches = logs.filter((l) => !l.removed && l.address?.toLowerCase() === usdt.toLowerCase() && l.topics?.length === 3 && l.topics[0] === TRANSFER2 && address(l.topics[1]) === f.from && address(l.topics[2]) === f.to && Number(BigInt(l.logIndex)) === f.logIndex && BigInt(l.data) === BigInt(f.amountRaw));
    if (matches.length !== 1) continue;
    const verified = logs.some((l) => !l.removed && l.address?.toLowerCase() === ENTRY2 && l.topics?.length === 4 && l.topics[0] === USEROP && address(l.topics[2]) === f.from && address(l.topics[3]) === f.to && String(l.data).length >= 130 && BigInt("0x" + l.data.slice(66, 130)) === 1n);
    if (!verified) continue;
    const id = f.hash + ":" + f.logIndex;
    if (seen.has(id)) throw Error("\u4EE3\u4ED8\u8D39\u7528\u51ED\u8BC1\u91CD\u590D");
    seen.add(id);
    fees.push({ ...f, blockHash: r.blockHash });
  }
  return fees;
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/production-store.js
import { randomUUID as randomUUID2 } from "node:crypto";

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/contract-production.js
var PRODUCTION_SOURCE = "0x67b97c3845438f264965ca154ba13051c6c73416";
var PRODUCTION_TOKEN = "0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d";
var PRODUCTION_FEE = "0x4252f9e683c7d38b6fd053346358f6460d982745";
var PRODUCTION_FIELDS = ["bnb_in", "esim_in", "bnb_output", "esim_output", "unallocated_output", "total_output"];
var zero = () => Object.fromEntries(PRODUCTION_FIELDS.map((k) => [k, "0"]));
var dayOf = (s) => new Date(s * 1e3).toISOString().slice(0, 10);
function advanceProduction(prior, events, { block, blockHash, cutoff }) {
  if (!prior || prior.version !== 1 || !Number.isSafeInteger(block) || block <= prior.throughBlock || !/^0x[0-9a-f]{64}$/.test(blockHash) || !Number.isFinite(cutoff) || cutoff <= prior.cutoff) throw Error("PRODUCTION_BOUNDARY");
  const state = structuredClone(prior), seen = /* @__PURE__ */ new Set();
  for (const d of Object.values(state.days)) delete d.fee_output;
  for (const e of [...events].sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2])) {
    if (!Number.isSafeInteger(e.block) || e.block <= prior.throughBlock || e.block > block) throw Error("PRODUCTION_REPLAY_OR_RANGE");
    if (!e.id || seen.has(e.id) || !Number.isFinite(e.timestamp) || e.timestamp >= cutoff || !/^\d+$/.test(e.amount) || !["bnb", "esim", "stake", "admin", "compound", "claim"].includes(e.kind)) throw Error("PRODUCTION_EVENT");
    seen.add(e.id);
    const day = dayOf(e.timestamp), d = state.days[day] ??= zero(), add = (k, n) => {
      d[k] = String(BigInt(d[k]) + BigInt(n));
    };
    const a = state.accounts[e.address] ??= {};
    if (e.kind === "bnb") {
      add("bnb_in", e.amount);
      if (BigInt(e.amount) > 0n) a.bnb ??= e.block;
    } else if (e.kind === "esim") add("esim_in", e.amount);
    else if (e.kind === "stake") a.esim ??= e.block;
    else if (e.kind === "admin" || e.kind === "compound") a.unknown ??= e.block;
    else {
      if (!/^\d+$/.test(e.fee)) throw Error("PRODUCTION_FEE");
      const key2 = !a.unknown && a.bnb && a.bnb < e.block && !a.esim ? "bnb_output" : !a.unknown && a.esim && a.esim < e.block && !a.bnb ? "esim_output" : "unallocated_output";
      add(key2, e.amount);
      add("total_output", e.amount);
    }
  }
  state.throughBlock = block;
  state.blockHash = blockHash;
  state.cutoff = cutoff;
  for (const d of Object.values(state.days)) if (BigInt(d.bnb_output) + BigInt(d.esim_output) + BigInt(d.unallocated_output) !== BigInt(d.total_output)) throw Error("PRODUCTION_TOTAL_MISMATCH");
  return state;
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/production-store.js
var PRODUCTION_TOPICS = { bnb: "0x2c10952a9e3d223e0bf2d6a58a6387f1207d66c90a6dfc929e16a0e039fc07f3", stake: "0x492cc47ab15a29b394edf8b1cacdcb45d64a334b396c29be19a945a5bafd9392", admin: "0x21112582bb44cf5f35ac85b6f9dac0b4675677ae9fd41ea1af3e9c365cbb27c4", compound: "0x7079b67c5053ead6799bac0cb7a0a9453a38e507f1b9e3828e20a13fc5d0d129", claim: "0x812be816db82c66cd18ca8457005cd84689642d8ac4d38599cc6af444a2dc72a" };
var TRANSFER3 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
var hex = (n) => "0x" + n.toString(16);
async function updateProduction(target = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(target) || target <= 0) throw Error("INVALID_PRODUCTION_TARGET");
  const c = await db().connect(), token = randomUUID2();
  let locked = false;
  try {
    const claimed = await c.query("UPDATE esim_ledger.contract_production_state SET lease_token=$1,lease_until=now()+interval '10 minutes' WHERE id=1 AND (lease_until IS NULL OR lease_until<now()) RETURNING state", [token]);
    locked = claimed.rowCount === 1;
    if (!locked) return { status: "busy" };
    const prior = claimed.rows[0].state;
    const cache2 = {}, get = async (calls2) => {
      await fill(calls2, cache2);
      return reader(cache2)(calls2);
    };
    const [chain, head, previous] = await get([["eth_chainId", []], ["eth_getBlockByNumber", ["latest", false]], ["eth_getBlockByNumber", [hex(prior.throughBlock), false]]]);
    if (chain !== "0x38" || previous.hash !== prior.blockHash) throw Error("PRODUCTION_CHAIN_CHANGED");
    const end = Math.min(Number(BigInt(head.number)) - 64, prior.throughBlock + 5e4, target);
    if (end <= prior.throughBlock) return { status: "current", block: prior.throughBlock };
    const calls = [];
    for (let start = prior.throughBlock + 1; start <= end; start += 5e3) {
      const range = { fromBlock: hex(start), toBlock: hex(Math.min(start + 4999, end)) };
      calls.push(["eth_getLogs", [{ ...range, address: PRODUCTION_SOURCE, topics: [Object.values(PRODUCTION_TOPICS)] }]], ["eth_getLogs", [{ ...range, address: PRODUCTION_TOKEN, topics: [TRANSFER3, null, "0x" + PRODUCTION_SOURCE.slice(2).padStart(64, "0")] }]]);
    }
    const pages = await get(calls), events = [], missingTimes = /* @__PURE__ */ new Set();
    for (const logs of pages) for (const r of logs) if (!r.blockTimestamp) missingTimes.add(Number(BigInt(r.blockNumber)));
    const blocks = [...missingTimes], headers = await get(blocks.map((b) => ["eth_getBlockByNumber", [hex(b), false]])), times = new Map(headers.map((r, i) => [blocks[i], Number(BigInt(r.timestamp))]));
    for (const [i, logs] of pages.entries()) {
      if (!Array.isArray(logs) || logs.length >= 1e4) throw Error("PRODUCTION_LOG_PAGE_LIMIT");
      for (const r of logs) {
        const block = Number(BigInt(r.blockNumber)), kind = i % 2 ? "esim" : Object.keys(PRODUCTION_TOPICS).find((k) => PRODUCTION_TOPICS[k] === r.topics[0]);
        if (r.removed || !kind || r.address.toLowerCase() !== (kind === "esim" ? PRODUCTION_TOKEN : PRODUCTION_SOURCE) || !/^0x[0-9a-f]{64}$/i.test(r.transactionHash) || !/^0x(?:[0-9a-f]{64})+$/i.test(r.data)) throw Error("PRODUCTION_INVALID_LOG");
        const words = r.data.slice(2).match(/.{64}/g).map((x) => String(BigInt("0x" + x)));
        const address2 = "0x" + r.topics[kind === "admin" ? 2 : 1].slice(-40);
        events.push({ kind, id: r.transactionHash + ":" + r.logIndex, block, order: [block, Number(BigInt(r.transactionIndex)), Number(BigInt(r.logIndex))], timestamp: r.blockTimestamp ? Number(BigInt(r.blockTimestamp)) : times.get(block), address: address2, amount: kind === "claim" ? words[2] : kind === "bnb" || kind === "esim" ? words[0] : "0", fee: kind === "claim" ? words[1] : "0" });
      }
    }
    const [last, next2, check] = await get([["eth_getBlockByNumber", [hex(end), false]], ["eth_getBlockByNumber", [hex(end + 1), false]], ["eth_getBlockByNumber", [hex(prior.throughBlock), false]]]);
    if (check.hash !== prior.blockHash || next2.parentHash !== last.hash) throw Error("PRODUCTION_BOUNDARY_CHANGED");
    const cutoff = next2.milliTimestamp ? Number(BigInt(next2.milliTimestamp)) / 1e3 : Number(BigInt(next2.timestamp));
    const state = advanceProduction(prior, events, { block: end, blockHash: last.hash, cutoff });
    const changed = await c.query("UPDATE esim_ledger.contract_production_state SET state=$1::jsonb,through_block=$2,updated_at=now()WHERE id=1 AND through_block=$3 AND lease_token=$4 AND lease_until>now()", [JSON.stringify(state), end, prior.throughBlock, token]);
    if (changed.rowCount !== 1) throw Error("PRODUCTION_CONCURRENT_UPDATE");
    return { status: end < Math.min(Number(BigInt(head.number)) - 64, target) ? "catching_up" : "current", block: end, cutoff: new Date(cutoff * 1e3).toISOString(), events: events.length };
  } finally {
    if (locked) await c.query("UPDATE esim_ledger.contract_production_state SET lease_token=NULL,lease_until=NULL WHERE id=1 AND lease_token=$1", [token]).catch(() => {
    });
    c.release();
  }
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/reinvest-store.js
import { randomUUID as randomUUID3 } from "node:crypto";

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/production-reinvest.js
var order = (a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2];
var requireValue = (ok, code) => {
  if (!ok) throw Error("REINVEST_" + code);
};
function matchProductionTransfers(transfers, events, source) {
  const indexed = /* @__PURE__ */ new Map(), evidence = /* @__PURE__ */ new Map(), claimIds = /* @__PURE__ */ new Set(), stakeIds = /* @__PURE__ */ new Set(), used = /* @__PURE__ */ new Set();
  for (const t of transfers) {
    if (t.from !== source && t.to !== source) continue;
    const k = [t.tx, t.from === source ? "claim" : "stake", t.from === source ? t.to : t.from, t.value].join(":");
    if (!indexed.has(k)) indexed.set(k, []);
    indexed.get(k).push(t);
  }
  for (const e of events) if (["claim", "stake"].includes(e.kind)) {
    const k = [e.tx, e.kind, e.address, e.amount].join(":");
    if (!evidence.has(k)) evidence.set(k, []);
    evidence.get(k).push(e);
  }
  for (const [k, es] of evidence) {
    const rows = (indexed.get(k) || []).sort(order);
    requireValue(rows.length >= es.length, "EVIDENCE_MATCH");
    if (rows.length !== es.length) continue;
    for (const e of es.sort(order)) {
      const t = rows.find((t2) => !used.has(t2.id) && order(t2, e) < 0);
      requireValue(t, "EVIDENCE_MATCH");
      used.add(t.id);
      (e.kind === "claim" ? claimIds : stakeIds).add(t.id);
    }
  }
  return { claimIds, stakeIds };
}
function advanceReinvest(prior, { transfers, claimIds, stakeIds, block, blockHash, cutoff }) {
  requireValue(prior?.version === 1 && Number.isSafeInteger(block) && block > prior.throughBlock && /^0x[0-9a-f]{64}$/.test(blockHash) && cutoff > prior.cutoff, "BOUNDARY");
  const state = structuredClone(prior), seen = /* @__PURE__ */ new Set();
  for (const t of [...transfers].sort(order)) {
    requireValue(t.id && !seen.has(t.id), "DUPLICATE");
    seen.add(t.id);
    requireValue(t.order[0] > prior.throughBlock && t.order[0] <= block && /^\d+$/.test(t.value) && Number.isFinite(t.timestamp) && t.timestamp < cutoff, "TRANSFER");
    const value = BigInt(t.value);
    if (!value || t.from === t.to) continue;
    if (stakeIds.has(t.id)) requireValue(Object.hasOwn(state.wallets, t.from), "OPENING");
    if (claimIds.has(t.id)) requireValue(Object.hasOwn(state.wallets, t.to), "OPENING");
    const from = state.wallets[t.from];
    if (from) {
      const balance = BigInt(from.balance), reward = BigInt(from.reward);
      requireValue(balance >= value && reward >= 0n && reward <= balance, "BALANCE");
      const confirmed = value > balance - reward ? value - (balance - reward) : 0n;
      if (stakeIds.has(t.id) && confirmed) {
        const day = new Date(t.timestamp * 1e3).toISOString().slice(0, 10);
        state.days[day] = String(BigInt(state.days[day] || "0") + confirmed);
      }
      from.balance = String(balance - value);
      from.reward = String(reward > value ? reward - value : 0n);
    }
    const to = state.wallets[t.to];
    if (to) {
      to.balance = String(BigInt(to.balance) + value);
      if (claimIds.has(t.id)) to.reward = String(BigInt(to.reward) + value);
    }
  }
  state.throughBlock = block;
  state.blockHash = blockHash;
  state.cutoff = cutoff;
  return state;
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/reinvest-store.js
var TRANSFER4 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
var hex2 = (n) => "0x" + n.toString(16);
var addr2 = (t) => "0x" + t.slice(-40);
var ordered = (r) => [r.blockNumber, r.transactionIndex, r.logIndex].map((v) => Number(BigInt(v)));
async function updateReinvest(target) {
  const c = await db().connect(), token = randomUUID3();
  let locked = false;
  try {
    const claimed = await c.query("UPDATE esim_ledger.production_reinvest_state SET lease_token=$1,lease_until=now()+interval '10 minutes' WHERE id=1 AND (lease_until IS NULL OR lease_until<now()) RETURNING state", [token]);
    if (!claimed.rowCount) return { status: "busy_or_unseeded" };
    locked = true;
    const prior = claimed.rows[0].state, end = Math.min(target, prior.throughBlock + 5e4);
    if (end <= prior.throughBlock) return { status: "current", block: prior.throughBlock };
    const cache2 = {}, get = async (calls) => {
      await fill(calls, cache2);
      return reader(cache2)(calls);
    };
    const [chain, old, last, next2] = await get([["eth_chainId", []], ["eth_getBlockByNumber", [hex2(prior.throughBlock), false]], ["eth_getBlockByNumber", [hex2(end), false]], ["eth_getBlockByNumber", [hex2(end + 1), false]]]);
    if (chain !== "0x38" || old.hash !== prior.blockHash || next2.parentHash !== last.hash) throw Error("REINVEST_CHAIN_CHANGED");
    const queries = [];
    for (let start = prior.throughBlock + 1; start <= end; start += 5e3) {
      const range = { fromBlock: hex2(start), toBlock: hex2(Math.min(start + 4999, end)) };
      queries.push(["eth_getLogs", [{ ...range, address: PRODUCTION_TOKEN, topics: [TRANSFER4] }]], ["eth_getLogs", [{ ...range, address: PRODUCTION_SOURCE, topics: [[PRODUCTION_TOPICS.claim, PRODUCTION_TOPICS.stake]] }]]);
    }
    const pages = await get(queries), transfers = [], events = [];
    const missing = /* @__PURE__ */ new Set();
    for (const logs of pages) {
      if (!Array.isArray(logs) || logs.length >= 1e4) throw Error("REINVEST_LOG_LIMIT");
      for (const r of logs) if (!r.blockTimestamp) missing.add(ordered(r)[0]);
    }
    const blocks = [...missing], headers = await get(blocks.map((b) => ["eth_getBlockByNumber", [hex2(b), false]])), times = new Map(headers.map((r, i) => [blocks[i], Number(BigInt(r.timestamp))]));
    for (const [i, logs] of pages.entries()) for (const r of logs) {
      if (r.removed || r.address.toLowerCase() !== (i % 2 ? PRODUCTION_SOURCE : PRODUCTION_TOKEN)) throw Error("REINVEST_INVALID_LOG");
      const order2 = ordered(r), base = { id: r.transactionHash + ":" + r.logIndex, tx: r.transactionHash, order: order2, timestamp: r.blockTimestamp ? Number(BigInt(r.blockTimestamp)) : times.get(order2[0]) };
      if (i % 2) {
        const kind = r.topics[0] === PRODUCTION_TOPICS.claim ? "claim" : r.topics[0] === PRODUCTION_TOPICS.stake ? "stake" : null;
        if (!kind) throw Error("REINVEST_EVENT");
        const words = r.data.slice(2).match(/.{64}/g);
        events.push({ ...base, kind, address: addr2(r.topics[1]), amount: String(BigInt("0x" + words[kind === "claim" ? 2 : 0])) });
      } else {
        if (r.topics[0] !== TRANSFER4 || r.topics.length !== 3) throw Error("REINVEST_TRANSFER");
        transfers.push({ ...base, from: addr2(r.topics[1]), to: addr2(r.topics[2]), value: String(BigInt(r.data)) });
      }
    }
    const wallets = [...new Set(events.map((e) => e.address))].filter((a) => a !== PRODUCTION_FEE && !Object.hasOwn(prior.wallets, a));
    const openings = await get(wallets.map((a) => ["eth_call", [{ to: PRODUCTION_TOKEN, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex2(prior.throughBlock)]]));
    wallets.forEach((a, i) => {
      prior.wallets[a] = { balance: String(BigInt(openings[i])), reward: "0" };
    });
    const proof = matchProductionTransfers(transfers, events.filter((e) => e.address !== PRODUCTION_FEE), PRODUCTION_SOURCE);
    const cutoff = next2.milliTimestamp ? Number(BigInt(next2.milliTimestamp)) / 1e3 : Number(BigInt(next2.timestamp));
    const state = advanceReinvest(prior, { transfers, ...proof, block: end, blockHash: last.hash, cutoff });
    const touched = [...new Set(events.map((e) => e.address))].filter((a) => a !== PRODUCTION_FEE);
    const closing = await get(touched.map((a) => ["eth_call", [{ to: PRODUCTION_TOKEN, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex2(end)]]));
    if (touched.some((a, i) => state.wallets[a].balance !== String(BigInt(closing[i])))) throw Error("REINVEST_CLOSING_MISMATCH");
    const check = (await get([["eth_getBlockByNumber", [hex2(prior.throughBlock), false]]]))[0];
    if (check.hash !== prior.blockHash) throw Error("REINVEST_CHAIN_CHANGED");
    const saved = await c.query("UPDATE esim_ledger.production_reinvest_state SET state=$1::jsonb,through_block=$2,updated_at=now()WHERE id=1 AND through_block=$3 AND lease_token=$4 AND lease_until>now()", [JSON.stringify(state), end, prior.throughBlock, token]);
    if (saved.rowCount !== 1) throw Error("REINVEST_CONCURRENT_UPDATE");
    return { status: end < target ? "catching_up" : "current", block: end, transfers: transfers.length, stakes: proof.stakeIds.size };
  } finally {
    if (locked) await c.query("UPDATE esim_ledger.production_reinvest_state SET lease_token=NULL,lease_until=NULL WHERE id=1 AND lease_token=$1", [token]).catch(() => {
    });
    c.release();
  }
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/lib/collector.js
var import_engine = __toESM(require_engine(), 1);
var BOT = "0xe1de6ac2ee058df5d3be8edeb62a8815fd13ff5a";
var EVENT = "0x7530424e0c452360e492059aa00e241fcb95eef959a0d17221f75f464f49eb3e";
var TRANSFER5 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
var HASH = (x) => createHash4("sha256").update(JSON.stringify(x)).digest("hex");
var hex3 = (n) => "0x" + BigInt(n).toString(16);
var adr = (t) => "0x" + t.slice(-40).toLowerCase();
var labels = { init: "\u786E\u8BA4\u7EDF\u8BA1\u65F6\u95F4", transfers: "\u8BFB\u53D6\u666E\u901A\u94B1\u5305\u6D41\u6C34", nfts: "\u6838\u5BF9LP\u5F52\u5C5E", transactions: "\u8BFB\u53D6\u666E\u901A\u94B1\u5305\u51ED\u8BC1", balances: "\u6838\u5BF9\u671F\u521D\u671F\u672B\u4F59\u989D", nonces: "\u8865\u67E5\u9057\u6F0F\u6D41\u6C34", traces: "\u533A\u5206\u8F6C\u8D26\u4E0E\u624B\u7EED\u8D39", lp: "\u6838\u5BF9LP\u672C\u91D1", times: "\u6838\u5BF9\u6D41\u6C34\u65F6\u95F4", analyze: "\u6838\u5BF9\u4F59\u989D", residual: "\u8865\u67E5\u4F59\u989D\u5DEE\u989D", extra: "\u8865\u5145\u94FE\u4E0A\u51ED\u8BC1", ready: "\u4FDD\u5B58\u5DF2\u6838\u9A8C\u7ED3\u679C" };
function transactionHashes(transfers) {
  return [...new Set(transfers.map((t) => t.hash))];
}
function nativeReceiptQueries(j, wallets) {
  return [...new Set(j.nativeTransfers.filter((t) => wallets.includes(t.to.toLowerCase()) && j.receipts[t.hash]?.esimReceiptSchema !== 3).map((t) => t.hash))].map((h) => ["eth_getTransactionReceipt", [h]]);
}
function positionsFromView(view, day) {
  return view.rows.map((r, i) => [day, r[1].match(/address\/(0x[0-9a-f]+)/)[1], r[2], ...r.slice(3, 17).map((x) => String(x ?? 0)), "0", view.notes[i] || ""]);
}
function tokenUnits(value) {
  const n = BigInt(value), sign = n < 0n ? "-" : "", digits = (n < 0n ? -n : n).toString().padStart(19, "0"), fraction = digits.slice(-18).replace(/0+$/, "");
  return sign + digits.slice(0, -18) + (fraction ? "." + fraction : "");
}
function exactPositions(view, day, result, balanceOnly, receipts = {}, usdt = "") {
  const raw = new Map(result.daily.map((r) => [r.wallet, { ...r.raw }])), robots = new Set(balanceOnly), contexts = new Map(result.transactions.map((t) => [t.hash + "|" + t.wallet, t]));
  for (const f of result.flows) {
    let wallet, kind;
    if (raw.has(f.from) && robots.has(f.to)) {
      wallet = f.from;
      kind = "Out";
    } else if (raw.has(f.to) && robots.has(f.from)) {
      wallet = f.to;
      kind = "In";
    } else continue;
    if (contexts.get(f.hash + "|" + wallet)?.type !== "\u5916\u90E8\u8F6C\u8D26") continue;
    const r = raw.get(wallet), key2 = (kind === "Out" ? "withdraw" : "deposit") + f.asset, n = BigInt(f.amountRaw), remaining = BigInt(r[key2]) - n;
    if (remaining < 0n) throw Error("\u5E93\u5185\u8F6C\u8D26\u539F\u59CB\u6570\u91CF\u4E0D\u4E00\u81F4");
    r[key2] = String(remaining);
    r["internal" + kind + f.asset] = String(BigInt(r["internal" + kind + f.asset]) + n);
  }
  for (const f of verifiedTransferFees(result, receipts, usdt)) {
    const r = raw.get(f.from), n = BigInt(f.amountRaw);
    if (!r || BigInt(r.withdrawUSDT) < n) throw Error("\u4EE3\u4ED8\u8D39\u7528\u4E0E\u539F\u59CB\u8F6C\u51FA\u91D1\u989D\u4E0D\u4E00\u81F4");
    r.withdrawUSDT = String(BigInt(r.withdrawUSDT) - n);
    r.otherUSDT = String(BigInt(r.otherUSDT) - n);
  }
  const native = new Map((result.nativeCategories || []).map((r) => [r.wallet, r.raw]));
  return positionsFromView(view, day).map((p) => {
    const r = raw.get(p[1]), a = p[2];
    if (!r) throw Error("\u7F3A\u5C11\u539F\u59CB\u6574\u6570\u8D26\u76EE");
    if (a === "BNB") {
      const n = native.get(p[1]);
      if (!n || r.gas === void 0) throw Error("\u7F3A\u5C11BNB\u539F\u59CB\u6574\u6570\u8D26\u76EE");
      [r.openingBNB, n.buy, n.sell, n.deposit, n.withdraw, n.internal, n.other, r.gas, r.closingBNB].forEach((v2, i) => p[[3, 4, 5, 9, 10, 11, 12, 13, 14][i]] = tokenUnits(v2));
      return p;
    }
    if (!["ESIM", "USDT"].includes(a)) return p;
    const v = [r["opening" + a], String(BigInt(r["\u4E70\u5165" + a]) + BigInt(r["bnbBuy" + a])), r["\u5356\u51FA" + a], r["lpIn" + a], r["lpOut" + a], r["lpFee" + a], r["deposit" + a], r["withdraw" + a], String(BigInt(r["internalIn" + a]) - BigInt(r["internalOut" + a])), r["other" + a], "0", r["closing" + a]];
    v.forEach((n, i) => p[i + 3] = tokenUnits(n));
    return p;
  });
}
var manualReportsComplete = (production, reinvest, target) => Number.isSafeInteger(target) && target > 0 && [production, reinvest].every((r) => r?.status === "current" && Number.isSafeInteger(r.block) && r.block >= target);
async function startSync(source = "manual") {
  return transaction((c) => enqueueSync(c, source));
}
async function enqueueSync(c, source = "automatic") {
  await c.query("SELECT pg_advisory_xact_lock(7693201)");
  if (source !== "manual") {
    const job = (await c.query("SELECT id,status,stage,source,state,error FROM esim_ledger.sync_runs WHERE source='manual' ORDER BY started_at DESC LIMIT 1 FOR UPDATE")).rows[0];
    if (job && ["queued", "running"].includes(job.status)) return { id: job.id, status: job.status, stage: job.stage, source: "manual" };
    if (job?.status === "failed" && canResumeFailed(job, job.state?.cohortHash)) return (await c.query("UPDATE esim_ledger.sync_runs SET status='queued',stage='\u4ECE\u65AD\u70B9\u7EE7\u7EED\u624B\u52A8\u7EDF\u8BA1',lease_until=NULL,finished_at=NULL,updated_at=now() WHERE id=$1 RETURNING id,status,stage,source", [job.id])).rows[0];
    return { id: null, status: "idle", stage: "\u7B49\u5F85\u624B\u52A8\u7EDF\u8BA1", mode: "manual" };
  }
  const requestedAt = (/* @__PURE__ */ new Date()).toISOString();
  const all = (await c.query("SELECT address,mode,active_from,backfill_pending FROM esim_ledger.addresses ORDER BY ordinal")).rows, dates = (await c.query("SELECT day,status,cohort_hash FROM esim_ledger.periods ORDER BY day")).rows;
  const { plan, hash: hash2 } = buildSyncPlan(all, dates, { source, now: new Date(requestedAt) });
  const active = (await c.query("SELECT id,status,stage,source,state->>'cohortHash' AS cohort_hash FROM esim_ledger.sync_runs WHERE status IN ('queued','running') LIMIT 1 FOR UPDATE")).rows[0];
  if (active?.cohort_hash === hash2 && active.source === "manual") return active;
  if (active) await c.query("UPDATE esim_ledger.sync_runs SET status='failed',stage='\u5DF2\u7531\u672C\u6B21\u624B\u52A8\u7EDF\u8BA1\u66FF\u4EE3',error='\u65E7\u4EFB\u52A1\u5DF2\u6682\u505C\uFF0C\u65AD\u70B9\u4FDD\u7559',lease_version=lease_version+1,lease_until=NULL,finished_at=now(),updated_at=now() WHERE id=$1", [active.id]);
  const latest = (await c.query("SELECT id,status,source,state,error FROM esim_ledger.sync_runs ORDER BY updated_at DESC LIMIT 1")).rows[0], failed = latest?.status === "failed" ? latest : null;
  if (failed?.source === "manual" && canResumeFailed(failed, hash2)) return (await c.query("UPDATE esim_ledger.sync_runs SET status='queued',stage='\u4ECE\u65AD\u70B9\u7EE7\u7EED\u56DE\u6EAF',lease_until=NULL,finished_at=NULL,updated_at=now() WHERE id=$1 RETURNING id,status,stage,source", [failed.id])).rows[0];
  if (failed?.state?.cohortHash === hash2 && source !== "manual") return { id: failed.id, status: "failed", stage: "\u56DE\u6EAF\u4E2D\u65AD\uFF0C\u9700\u8981\u6838\u5BF9", error: failed.error };
  if (!plan.length) return { id: null, status: "complete", stage: "\u4ECA\u65E5\u5DF2\u66F4\u65B0" };
  const state = { requestedAt, catalog: all.map(({ address: address2, mode, active_from }) => ({ address: address2, mode, active_from })), addresses: all.map((x) => x.address), wallets: all.filter((a) => a.mode === "wallet").map((a) => a.address), balanceOnly: all.filter((a) => a.mode !== "wallet").map((a) => a.address), plan, index: 0, cache: {}, nfts: null, wallet: null, stage: "\u51C6\u5907", cohortHash: hash2 };
  return (await c.query("INSERT INTO esim_ledger.sync_runs(status,source,state)VALUES('queued',$1,$2)RETURNING id,status,stage,source", [source, JSON.stringify(state)])).rows[0];
}
async function syncStatus(id) {
  const row = (await db().query("SELECT id,status,source,stage,error,verified_days,lease_until,state->>'retryAfter' AS retry_after FROM esim_ledger.sync_runs WHERE id=$1", [id])).rows[0];
  return row && row.source !== "manual" ? { ...row, status: "paused", stage: "\u81EA\u52A8\u7EDF\u8BA1\u5DF2\u6682\u505C\uFF0C\u7B49\u5F85\u624B\u52A8\u542F\u52A8" } : row;
}
async function getNftHistory(state) {
  if (state.nfts) return;
  const seed = (await db().query("SELECT result FROM esim_ledger.rpc_cache WHERE key='nft-history-v2'")).rows[0]?.result;
  if (seed?.cohortHash === state.cohortHash && Array.isArray(seed.events)) {
    state.nfts = seed.events;
    return;
  }
  const head = await rpc("eth_getBlockByNumber", ["latest", false], state.cache, (m, b) => ({ number: b.number, hash: b.hash })), end = hex3(BigInt(head.number) - 64n), queries = state.wallets.flatMap((a) => ["fromAddress", "toAddress"].map((dir) => ["alchemy_getAssetTransfers", [{ fromBlock: "0x0", toBlock: end, category: ["erc721"], excludeZeroValue: false, withMetadata: true, maxCount: "0x3e8", order: "asc", [dir]: a, contractAddresses: ["0x55f4c8aba71a1e923edc303eb4feff14608cc226", "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364"] }]]));
  for (let i = 0; i < queries.length; i += 20) await fill(queries.slice(i, i + 20), state.cache);
  const events = /* @__PURE__ */ new Map();
  for (const q of queries) {
    let page = null;
    const seen = /* @__PURE__ */ new Set();
    do {
      const params = { ...q[1][0], ...page ? { pageKey: page } : {} }, r = await rpc(q[0], [params], state.cache);
      if (!Array.isArray(r.transfers)) throw Error("LP NFT\u5386\u53F2\u5206\u9875\u4E0D\u5B8C\u6574");
      for (const t of r.transfers) {
        if (!t.uniqueId || !t.hash || !t.blockNum || events.has(t.uniqueId) && !isDeepStrictEqual(events.get(t.uniqueId), t)) throw Error("LP NFT\u5386\u53F2\u6807\u8BC6\u7F3A\u5931\u6216\u51B2\u7A81");
        events.set(t.uniqueId, t);
      }
      page = r.pageKey || null;
      if (page && (seen.has(page) || seen.size >= 100)) throw Error("LP NFT\u5386\u53F2\u5206\u9875\u91CD\u590D\u6216\u8FC7\u591A");
      if (page) seen.add(page);
    } while (page);
  }
  state.nfts = [...events.values()];
}
function walletTransferQueries(wallets, j) {
  return wallets.flatMap((a) => ["fromAddress", "toAddress"].map((dir) => ["alchemy_getAssetTransfers", [{ fromBlock: hex3(j.state.startBlock), toBlock: hex3(j.state.endBlock), category: ["external", "erc20", "erc721", "erc1155"], excludeZeroValue: false, withMetadata: true, maxCount: "0x3e8", order: "asc", [dir]: a }]]));
}
async function robotModel(state, wallet, engine) {
  const start = wallet.state.boundaries[0], end = wallet.state.boundaries[1], cache2 = state.cache, group = new Set(state.balanceOnly), cohort = new Set(state.addresses), tokens = [engine.config.token, engine.config.usdt];
  let logs = [];
  for (let lo = start.block + 1; lo <= end.block; lo += 25e3) {
    const hi = Math.min(end.block, lo + 24999);
    for (let i = 0; i < state.balanceOnly.length; i += 80) {
      const topics = state.balanceOnly.slice(i, i + 80).map((a) => "0x" + a.slice(2).padStart(64, "0"));
      for (const dir of [1, 2]) logs.push(...await rpc("eth_getLogs", [{ fromBlock: hex3(lo), toBlock: hex3(hi), address: tokens, topics: dir === 1 ? [TRANSFER5, topics] : [TRANSFER5, null, topics] }], cache2));
    }
  }
  const unique = [...new Map(logs.map((l) => [l.transactionHash + ":" + l.logIndex, l])).values()], exec = /* @__PURE__ */ new Set();
  for (let lo = start.block + 1; lo <= end.block; lo += 25e3) for (const l of await rpc("eth_getLogs", [{ fromBlock: hex3(lo), toBlock: hex3(Math.min(end.block, lo + 24999)), address: BOT, topics: [EVENT] }], cache2)) exec.add(l.transactionHash);
  const calls = [start, end].flatMap((b) => state.balanceOnly.flatMap((a) => tokens.map((t) => ["eth_call", [{ to: t, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex3(b.block)]])));
  await fill(calls, cache2);
  const nftCalls = state.balanceOnly.flatMap((a) => ["0x55f4c8aba71a1e923edc303eb4feff14608cc226", "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364"].map((t) => ["eth_call", [{ to: t, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex3(end.block)]]));
  await fill(nftCalls, cache2);
  if (nftCalls.some((q) => BigInt(cache2[key(q)]) !== 0n)) throw Error("\u673A\u5668\u4EBA\u51FA\u73B0LP\u6301\u4ED3\uFF0C\u9700\u8981\u8865\u5145\u672C\u91D1\u6838\u5BF9\uFF0C\u539F\u6570\u636E\u4FDD\u7559");
  const changes = /* @__PURE__ */ new Map(), externals = [];
  function bucket(a, t) {
    const k = a + "|" + t;
    if (!changes.has(k)) changes.set(k, { internal: 0n, externalIn: 0n, externalOut: 0n, trade: 0n });
    return changes.get(k);
  }
  for (const l of unique) {
    if (l.removed) throw Error("\u94FE\u4E0A\u53D1\u751F\u91CD\u7EC4\uFF0C\u8BF7\u91CD\u65B0\u66F4\u65B0");
    const from = adr(l.topics[1]), to = adr(l.topics[2]), amount = BigInt(l.data);
    if (!amount) continue;
    const internal = cohort.has(from) && cohort.has(to), trade = exec.has(l.transactionHash);
    for (const [a, sign] of [[from, -1n], [to, 1n]]) if (group.has(a)) {
      const b = bucket(a, l.address);
      if (internal) b.internal += sign * amount;
      else if (trade) b.trade += sign * amount;
      else if (sign > 0n) b.externalIn += amount;
      else b.externalOut += amount;
    }
    if (group.has(from) && !cohort.has(to) && !trade) {
      const block = await rpc("eth_getBlockByNumber", [l.blockNumber, false], cache2);
      externals.push([l.transactionHash, Number(BigInt(l.logIndex)), state.plan[state.index].day, new Date(Number(BigInt(block.timestamp)) * 1e3).toISOString(), from, to, l.address === tokens[0] ? "ESIM" : "USDT", tokenUnits(amount), String(amount)]);
    }
  }
  const positions = [];
  for (const a of state.balanceOnly) for (const [i, t] of tokens.entries()) {
    const opening = BigInt(cache2[key(["eth_call", [{ to: t, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex3(start.block)]])]), closing = BigInt(cache2[key(["eth_call", [{ to: t, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex3(end.block)]])]), b = bucket(a, t), net = closing - opening - b.internal - b.externalIn + b.externalOut;
    if (net !== b.trade) throw Error("\u673A\u5668\u4EBA\u4F59\u989D\u672A\u5BF9\u5E73\uFF0C\u539F\u6570\u636E\u4FDD\u7559");
    if (opening || closing || net || b.internal || b.externalIn || b.externalOut) positions.push([state.plan[state.index].day, a, i ? "USDT" : "ESIM", tokenUnits(opening), null, null, "0", "0", "0", tokenUnits(b.externalIn), tokenUnits(b.externalOut), tokenUnits(b.internal), "0", "0", tokenUnits(closing), "0", "0", tokenUnits(net), "\u673A\u5668\u4EBA\u4F59\u989D\u6CD5"]);
  }
  return { positions, externals };
}
async function resolveKnownExchanges(j, engine) {
  const candidates = j.result.transactions.filter((t) => t.nonEsimSwapWarning && !t.mixedSwapWarning && !t.lpInESIM && !t.lpInUSDT && !t.lpOutESIM && !t.lpOutUSDT);
  let changed = false;
  for (const t of candidates) {
    let resolution = (await db().query("SELECT resolution FROM esim_ledger.verified_resolutions WHERE hash=$1 AND wallet=$2", [t.hash, t.wallet])).rows[0]?.resolution;
    if (!resolution) {
      const calls = [["eth_getTransactionByHash", [t.hash]], ["eth_getTransactionReceipt", [t.hash]], ["debug_traceTransaction", [t.hash, { tracer: "callTracer" }]]], raw = (await db().query("SELECT method,result FROM esim_ledger.rpc_cache WHERE key=ANY($1::text[])", [calls.map(key)])).rows;
      resolution = verifyGasExchange({ wallet: t.wallet, esim: engine.config.token, tx: raw.find((r) => r.method === "eth_getTransactionByHash")?.result, receipt: raw.find((r) => r.method === "eth_getTransactionReceipt")?.result, trace: raw.find((r) => r.method === "debug_traceTransaction")?.result });
      if (resolution) await db().query("INSERT INTO esim_ledger.verified_resolutions(hash,wallet,resolution)VALUES($1,$2,$3)ON CONFLICT DO NOTHING", [t.hash, t.wallet, JSON.stringify(resolution)]);
    }
    if (resolution) {
      const list = j.state.config.verifiedNonEsimResolutions || [];
      if (!list.some((r) => r.hash === t.hash && r.wallet === t.wallet)) list.push(resolution);
      j.state.config.verifiedNonEsimResolutions = list;
      changed = true;
    }
  }
  if (changed) {
    j.stage = "analyze";
    engine.step(j);
  }
}
async function snapshot(state, j, engine) {
  await resolveKnownExchanges(j, engine);
  engine.verify(j.result);
  if (j.result.transactions.some((t) => t.nonEsimSwapWarning || t.mixedSwapWarning)) throw Error("\u6709\u5151\u6362\u6D41\u6C34\u5F85\u6838\u5B9E\uFF0C\u672C\u65E5\u6682\u4E0D\u8986\u76D6\u539F\u6570\u636E");
  const robots = await robotModel(state, j, engine), view = engine.view([], [], j).replace, rows = view.rows, cohort = new Set(state.addresses);
  const day = state.plan[state.index].day, positions = exactPositions(view, day, j.result, state.balanceOnly, j.receipts, engine.config.usdt).concat(robots.positions), external = engine.external(j, state.addresses).rows.map((r) => [r[9], r[10], day, new Date((r[1] - 25569) * 864e5 - 288e5).toISOString(), r[4], r[5], r[2] ? "USDT" : "ESIM", tokenUnits(r[8]), r[8]]).concat(robots.externals);
  for (const r of external) if (cohort.has(r[5])) throw Error("\u7EC4\u5185\u8F6C\u8D26\u4E0D\u80FD\u8BA1\u4E3A\u5BF9\u5916\u652F\u51FA");
  return { day, positions, external, addresses: state.addresses, cohortHash: state.cohortHash, start: j.state.boundaries[0].time, end: j.state.boundaries[1].time, startBlock: j.state.boundaries[0].block, endBlock: j.state.boundaries[1].block, price: String(j.price.price), partial: !!j.partial, hash: HASH({ positions, external }), proof: { catalog: (state.catalog || []).filter((a) => state.addresses.includes(a.address)).map(({ address: address2, mode, active_from }) => ({ address: address2, mode, active_from })), walletChecks: state.wallets.length * 3, robotChecks: state.balanceOnly.length * 2, rawErrors: 0, robotBalanceOnly: true, blocks: j.boundaryHashes, verifiedExchanges: (j.state.config.verifiedNonEsimResolutions || []).filter((r) => j.result.transactions.some((t) => t.hash === r.hash && t.wallet === r.wallet)) } };
}
async function runSync(id, budget = 45e3) {
  const claimed = (await db().query("UPDATE esim_ledger.sync_runs SET status='running',lease_version=lease_version+1,lease_until=now()+interval '6 minutes',updated_at=now() WHERE id=$1 AND source='manual' AND status IN ('queued','running') AND (lease_until IS NULL OR lease_until<now()) AND (state->>'retryAfter' IS NULL OR (state->>'retryAfter')::timestamptz<=now()) RETURNING *", [id])).rows[0];
  if (!claimed) return syncStatus(id);
  const s = claimed.state, endAt = Date.now() + budget, engine = (0, import_engine.createEngine)();
  s.requestedAt ||= new Date(claimed.started_at || Date.now()).toISOString();
  const requestedNow = new Date(s.requestedAt);
  engine.config = { ...engine.config, addresses: s.wallets, inputAddresses: s.wallets };
  try {
    const current = (await db().query("SELECT address,mode,active_from FROM esim_ledger.addresses ORDER BY ordinal")).rows;
    if (cohortHash(current) !== s.cohortHash) throw Error("\u5730\u5740\u5E93\u5DF2\u53D8\u5316\uFF0C\u672C\u8F6E\u7ED3\u679C\u4E0D\u53D1\u5E03\uFF0C\u8BF7\u91CD\u65B0\u66F4\u65B0");
    if (s.retryable && s.retryCount >= 8) s.retryCount = 0;
    delete s.retryAfter;
    delete s.cache[key(["eth_getBlockByNumber", ["latest", false]])];
    closeElapsedPartialDays(s, requestedNow);
    if ((await db().query("SELECT 1 FROM esim_ledger.addresses WHERE backfill_pending LIMIT 1")).rowCount) {
      const { plan } = buildSyncPlan(current.map((a) => ({ ...a, backfill_pending: true })), [], { source: "backfill", now: requestedNow });
      const partial = plan.find((p) => p.partial);
      if (partial && !s.plan.some((p) => p.day === partial.day)) s.plan.push(partial);
    }
    const published = (await db().query("SELECT day,status,end_at,cohort_hash FROM esim_ledger.periods")).rows;
    s.plan = extendSyncPlan(s.plan, current, published, { source: claimed.source, now: requestedNow });
    const saved = new Map(published.filter((p) => p.cohort_hash === collectionScope(current, p.day).cohortHash).map((p) => [p.day, p]));
    while (s.index < s.plan.length) {
      const p = s.plan[s.index], v = saved.get(p.day);
      if (!v || !p.partial && v.status !== "complete" || p.partial && new Date(v.end_at) < new Date(p.end)) break;
      s.index++;
      s.wallet = null;
      s.cache = {};
    }
    if (s.cacheVersion !== 2) {
      s.cache = {};
      s.cacheVersion = 2;
      if (s.wallet) for (const [h, r] of Object.entries(s.wallet.receipts || {})) s.wallet.receipts[h] = engine.trim("eth_getTransactionReceipt", r);
    }
    if (s.index < s.plan.length) await getNftHistory(s);
    while (s.index < s.plan.length && Date.now() < endAt) {
      const planned = s.plan[s.index], scope = { ...s, ...collectionScope(s.catalog || current, planned.day) };
      engine.config = { ...engine.config, addresses: scope.wallets, inputAddresses: scope.wallets };
      if (!s.wallet) s.wallet = { day: planned.day, partial: planned.partial, endIso: planned.end, stage: "init", index: 0, rpc: {} };
      let j = s.wallet;
      engine.setRPC(reader(s.cache));
      engine.setJob(j);
      s.stage = `${s.index + 1}/${s.plan.length}\u5929 \xB7 ${planned.day} \xB7 ${labels[j.stage] || j.stage}`;
      if (j.stage === "ready" && j.result?.daily.some((r) => r.raw?.gas === void 0)) j.stage = "analyze";
      try {
        if (j.stage === "transfers" && j.index === 0) {
          const qs = walletTransferQueries(scope.wallets, j);
          for (let i = 0; i < qs.length; i += 20) await fill(qs.slice(i, i + 20), s.cache, (m, x) => engine.trim(m, x));
        }
        if (j.stage === "nfts") {
          j.nftTransfers = [...new Map(s.nfts.concat(j.transfers.filter((t) => t.category === "erc721")).map((t) => [t.uniqueId, t])).values()];
          j.index = scope.wallets.length * 2;
        }
        if (j.stage === "transactions" && j.index === 0) j.hashes = transactionHashes(j.transfers);
        if (j.stage === "balances" && j.index === 0) {
          const qs = j.state.boundaries.flatMap((b) => scope.wallets.flatMap((a) => [engine.config.token, engine.config.usdt].map((t) => ["eth_call", [{ to: t, data: "0x70a08231" + a.slice(2).padStart(64, "0") }, hex3(b.block)]]).concat([["eth_getBalance", [a, hex3(b.block)]], ["eth_getTransactionCount", [a, hex3(b.block)]]])));
          await fill(qs, s.cache, (m, x) => engine.trim(m, x));
        }
        if (j.stage === "lp") {
          const qs = j.state.boundaries.flatMap((b) => engine.owners(engine.config.nftSeed, j.nftTransfers, b.block).flatMap((o) => ["0x99fbab88", "0x6352211e"].map((sig) => ["eth_call", [{ to: o.manager, data: sig + BigInt(o.tokenId).toString(16).padStart(64, "0") }, hex3(b.block)]])));
          await fill(qs, s.cache, (m, x) => engine.trim(m, x));
        }
        if (j.stage === "ready") {
          const result = await snapshot(scope, j, engine);
          await publish(result, { id, version: claimed.lease_version });
          s.nfts = j.nftTransfers;
          await db().query("INSERT INTO esim_ledger.rpc_cache(key,method,result)VALUES('nft-history-v2','metadata',$1)ON CONFLICT(key)DO UPDATE SET result=excluded.result", [JSON.stringify({ cohortHash: s.cohortHash, events: s.nfts })]);
          s.index++;
          s.wallet = null;
          s.cache = {};
          s.retryCount = 0;
          continue;
        }
        if (j.stage === "analyze") {
          const qs = nativeReceiptQueries(j, scope.wallets), restored = {};
          if (qs.length) await fill(qs, restored, (m, r) => engine.trim(m, r));
          for (const q of qs) {
            const h = q[1][0], receipt = restored[key(q)];
            if (!receipt || receipt.transactionHash !== h || receipt.blockHash !== j.receipts[h]?.blockHash) throw Error("BNB\u7ED3\u7B97\u539F\u59CB\u56DE\u6267\u7F3A\u5931\u6216\u533A\u5757\u4E0D\u4E00\u81F4");
            j.receipts[h] = receipt;
          }
        }
        const draft = structuredClone(j);
        engine.setJob(draft);
        engine.step(draft);
        s.wallet = draft;
        s.retryCount = 0;
      } catch (e) {
        if (e instanceof NeedRpc) {
          await fill(e.calls, s.cache, (m, x) => engine.trim(m, x));
        } else throw e;
      }
    }
    if (s.index >= s.plan.length && !s.productionComplete && Date.now() < endAt) {
      s.stage = "\u6838\u5BF9\u5408\u7EA6\u4EA7\u51FA\u4E0E\u590D\u6295";
      s.productionTarget ||= Number((await db().query("SELECT end_block FROM esim_ledger.periods WHERE day=$1", [s.plan.at(-1).day])).rows[0]?.end_block);
      if (!Number.isSafeInteger(s.productionTarget) || s.productionTarget <= 0) throw Error("MANUAL_TARGET_MISSING");
      const production = await updateProduction(s.productionTarget);
      const reinvest = production.block ? await updateReinvest(Math.min(production.block, s.productionTarget)) : null;
      s.productionComplete = manualReportsComplete(production, reinvest, s.productionTarget);
    }
    return await transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(7693201)");
      const owned = (await c.query("SELECT 1 FROM esim_ledger.sync_runs WHERE id=$1 AND lease_version=$2 AND lease_until>now() FOR UPDATE", [id, claimed.lease_version])).rowCount;
      if (!owned) throw Error("SYNC_LEASE_LOST");
      let done = s.index >= s.plan.length;
      if (done) {
        const finishNow = requestedNow, current2 = (await c.query("SELECT address,mode,active_from FROM esim_ledger.addresses ORDER BY ordinal")).rows;
        if (cohortHash(current2) !== s.cohortHash) throw Error("\u5730\u5740\u5E93\u5DF2\u53D8\u5316\uFF0C\u672C\u8F6E\u7ED3\u679C\u4E0D\u53D1\u5E03\uFF0C\u8BF7\u91CD\u65B0\u66F4\u65B0");
        const periods = (await c.query("SELECT day,status,end_at,cohort_hash FROM esim_ledger.periods ORDER BY day")).rows;
        if (closeElapsedPartialDays(s, finishNow)) s.stage = "\u7EDF\u8BA1\u65E5\u5DF2\u7ED3\u675F\uFF0C\u7EE7\u7EED\u6838\u5BF9\u5B8C\u6574\u65E5";
        s.plan = extendSyncPlan(s.plan, current2, periods, { now: finishNow, source: claimed.source });
        done = s.index >= s.plan.length;
        if (done) {
          if (!requestedRangeCovered(s.plan, current2, periods)) throw Error("MANUAL_REQUEST_INCOMPLETE");
          if (buildSyncPlan(current2, periods, { now: finishNow }).plan.length) throw Error("\u5386\u53F2\u56DE\u6EAF\u8986\u76D6\u4E0D\u5B8C\u6574\uFF0C\u5F85\u56DE\u6EAF\u6807\u8BB0\u4FDD\u7559");
          await c.query("UPDATE esim_ledger.addresses SET backfill_pending=false WHERE address=ANY($1::text[])", [s.addresses]);
        }
      }
      done = done && s.productionComplete === true;
      return (await c.query("UPDATE esim_ledger.sync_runs SET state=$2,status=$3,stage=$4,verified_days=$5,error=NULL,updated_at=now(),lease_until=NULL,finished_at=CASE WHEN $3='complete' THEN now() ELSE NULL END WHERE id=$1 AND lease_version=$6 RETURNING id,status,stage,error,verified_days", [id, JSON.stringify(s), done ? "complete" : "running", done ? "\u66F4\u65B0\u5B8C\u6210" : s.stage, s.index, claimed.lease_version])).rows[0];
    });
  } catch (e) {
    const message = String(e.message || "\u66F4\u65B0\u5931\u8D25").replace(/https?:\/\/\S+/g, "[\u63A5\u53E3]").slice(0, 180);
    const pending = isBoundaryPending(e);
    s.retryable = isTransientSyncError(e);
    s.retryErrorCode = e.code || null;
    s.retryCount = pending ? 0 : Number(s.retryCount || 0) + 1;
    const retry = s.retryable && s.retryCount < 8;
    if (s.retryable) s.retryAfter = new Date(Number.isFinite(e.retryAt) ? e.retryAt : Date.now() + (retry ? 3e4 : 3e5)).toISOString();
    return (await db().query("UPDATE esim_ledger.sync_runs SET state=$2,status=$3,stage=$4,error=$5,verified_days=$6,lease_until=NULL,updated_at=now() WHERE id=$1 AND lease_version=$7 RETURNING id,status,stage,error,verified_days,state->>'retryAfter' AS retry_after", [id, JSON.stringify(s), retry ? "queued" : "failed", retry ? pending ? "\u7B49\u5F85\u7ED3\u675F\u533A\u5757\u786E\u8BA4\uFF0C\u81EA\u52A8\u7EE7\u7EED" : "\u63A5\u53E3\u6682\u65F6\u5931\u8D25\uFF0C\u81EA\u52A8\u4ECE\u65AD\u70B9\u7EE7\u7EED" : "\u66F4\u65B0\u672A\u5B8C\u6210\uFF0C\u539F\u6570\u636E\u4FDD\u7559", message, s.index, claimed.lease_version])).rows[0] || syncStatus(id);
  }
}

// ../../../../../../../../../ESIM市值统计/工程/esim-daily-ledger/web/scripts/server-step.js
process.env.DATABASE_URL ||= process.env.ESIM_REALTIME_DATABASE_URL;
process.env.BNB_RPC_URL ||= process.env.ALCHEMY_API_KEY ? `https://bnb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : "";
try {
  const job = await startSync(process.argv.includes("--manual") ? "manual" : "server");
  const result = job.id ? await runSync(job.id, Number(process.env.MM_STEP_MS || 2e4)) : job;
  const cutoff = result?.status === "complete" ? (await db().query("SELECT max(end_at) AS cutoff FROM esim_ledger.periods")).rows[0]?.cutoff : null;
  console.log(JSON.stringify({ phase: "mm-server-step", ...result, cutoff }));
  if (result?.status === "failed") process.exitCode = 1;
} catch (e) {
  console.error("MM_SERVER_STEP_FAILED", String(e.code || "").slice(0, 40));
  process.exitCode = 1;
} finally {
  await db().end();
}
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
