/* */ 
(function(process) {
  var _ = require('../util/index');
  var Cache = require('../cache');
  var cache = new Cache(1000);
  var filterTokenRE = /[^\s'"]+|'[^']*'|"[^"]*"/g;
  var reservedArgRE = /^in$|^-?\d+/;
  var str,
      dir;
  var c,
      i,
      l,
      lastFilterIndex;
  var inSingle,
      inDouble,
      curly,
      square,
      paren;
  function pushFilter() {
    var exp = str.slice(lastFilterIndex, i).trim();
    var filter;
    if (exp) {
      filter = {};
      var tokens = exp.match(filterTokenRE);
      filter.name = tokens[0];
      if (tokens.length > 1) {
        filter.args = tokens.slice(1).map(processFilterArg);
      }
    }
    if (filter) {
      (dir.filters = dir.filters || []).push(filter);
    }
    lastFilterIndex = i + 1;
  }
  function processFilterArg(arg) {
    if (reservedArgRE.test(arg)) {
      return {
        value: _.toNumber(arg),
        dynamic: false
      };
    } else {
      var stripped = _.stripQuotes(arg);
      var dynamic = stripped === arg;
      return {
        value: dynamic ? arg : stripped,
        dynamic: dynamic
      };
    }
  }
  exports.parse = function(s) {
    var hit = cache.get(s);
    if (hit) {
      return hit;
    }
    str = s;
    inSingle = inDouble = false;
    curly = square = paren = 0;
    lastFilterIndex = 0;
    dir = {};
    for (i = 0, l = str.length; i < l; i++) {
      c = str.charCodeAt(i);
      if (inSingle) {
        if (c === 0x27)
          inSingle = !inSingle;
      } else if (inDouble) {
        if (c === 0x22)
          inDouble = !inDouble;
      } else if (c === 0x7C && str.charCodeAt(i + 1) !== 0x7C && str.charCodeAt(i - 1) !== 0x7C) {
        if (dir.expression == null) {
          lastFilterIndex = i + 1;
          dir.expression = str.slice(0, i).trim();
        } else {
          pushFilter();
        }
      } else {
        switch (c) {
          case 0x22:
            inDouble = true;
            break;
          case 0x27:
            inSingle = true;
            break;
          case 0x28:
            paren++;
            break;
          case 0x29:
            paren--;
            break;
          case 0x5B:
            square++;
            break;
          case 0x5D:
            square--;
            break;
          case 0x7B:
            curly++;
            break;
          case 0x7D:
            curly--;
            break;
        }
      }
    }
    if (dir.expression == null) {
      dir.expression = str.slice(0, i).trim();
    } else if (lastFilterIndex !== 0) {
      pushFilter();
    }
    cache.put(s, dir);
    return dir;
  };
})(require('process'));
