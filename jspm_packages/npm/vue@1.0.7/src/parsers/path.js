/* */ 
(function(process) {
  var _ = require('../util/index');
  var Cache = require('../cache');
  var pathCache = new Cache(1000);
  var identRE = exports.identRE = /^[$_a-zA-Z]+[\w$]*$/;
  var APPEND = 0;
  var PUSH = 1;
  var BEFORE_PATH = 0;
  var IN_PATH = 1;
  var BEFORE_IDENT = 2;
  var IN_IDENT = 3;
  var BEFORE_ELEMENT = 4;
  var AFTER_ZERO = 5;
  var IN_INDEX = 6;
  var IN_SINGLE_QUOTE = 7;
  var IN_DOUBLE_QUOTE = 8;
  var IN_SUB_PATH = 9;
  var AFTER_ELEMENT = 10;
  var AFTER_PATH = 11;
  var ERROR = 12;
  var pathStateMachine = [];
  pathStateMachine[BEFORE_PATH] = {
    'ws': [BEFORE_PATH],
    'ident': [IN_IDENT, APPEND],
    '[': [BEFORE_ELEMENT],
    'eof': [AFTER_PATH]
  };
  pathStateMachine[IN_PATH] = {
    'ws': [IN_PATH],
    '.': [BEFORE_IDENT],
    '[': [BEFORE_ELEMENT],
    'eof': [AFTER_PATH]
  };
  pathStateMachine[BEFORE_IDENT] = {
    'ws': [BEFORE_IDENT],
    'ident': [IN_IDENT, APPEND]
  };
  pathStateMachine[IN_IDENT] = {
    'ident': [IN_IDENT, APPEND],
    '0': [IN_IDENT, APPEND],
    'number': [IN_IDENT, APPEND],
    'ws': [IN_PATH, PUSH],
    '.': [BEFORE_IDENT, PUSH],
    '[': [BEFORE_ELEMENT, PUSH],
    'eof': [AFTER_PATH, PUSH]
  };
  pathStateMachine[BEFORE_ELEMENT] = {
    'ws': [BEFORE_ELEMENT],
    '0': [AFTER_ZERO, APPEND],
    'number': [IN_INDEX, APPEND],
    "'": [IN_SINGLE_QUOTE, APPEND, ''],
    '"': [IN_DOUBLE_QUOTE, APPEND, ''],
    'ident': [IN_SUB_PATH, APPEND, '*']
  };
  pathStateMachine[AFTER_ZERO] = {
    'ws': [AFTER_ELEMENT, PUSH],
    ']': [IN_PATH, PUSH]
  };
  pathStateMachine[IN_INDEX] = {
    '0': [IN_INDEX, APPEND],
    'number': [IN_INDEX, APPEND],
    'ws': [AFTER_ELEMENT],
    ']': [IN_PATH, PUSH]
  };
  pathStateMachine[IN_SINGLE_QUOTE] = {
    "'": [AFTER_ELEMENT],
    'eof': ERROR,
    'else': [IN_SINGLE_QUOTE, APPEND]
  };
  pathStateMachine[IN_DOUBLE_QUOTE] = {
    '"': [AFTER_ELEMENT],
    'eof': ERROR,
    'else': [IN_DOUBLE_QUOTE, APPEND]
  };
  pathStateMachine[IN_SUB_PATH] = {
    'ident': [IN_SUB_PATH, APPEND],
    '0': [IN_SUB_PATH, APPEND],
    'number': [IN_SUB_PATH, APPEND],
    'ws': [AFTER_ELEMENT],
    ']': [IN_PATH, PUSH]
  };
  pathStateMachine[AFTER_ELEMENT] = {
    'ws': [AFTER_ELEMENT],
    ']': [IN_PATH, PUSH]
  };
  function getPathCharType(ch) {
    if (ch === undefined) {
      return 'eof';
    }
    var code = ch.charCodeAt(0);
    switch (code) {
      case 0x5B:
      case 0x5D:
      case 0x2E:
      case 0x22:
      case 0x27:
      case 0x30:
        return ch;
      case 0x5F:
      case 0x24:
        return 'ident';
      case 0x20:
      case 0x09:
      case 0x0A:
      case 0x0D:
      case 0xA0:
      case 0xFEFF:
      case 0x2028:
      case 0x2029:
        return 'ws';
    }
    if ((code >= 0x61 && code <= 0x7A) || (code >= 0x41 && code <= 0x5A)) {
      return 'ident';
    }
    if (code >= 0x31 && code <= 0x39) {
      return 'number';
    }
    return 'else';
  }
  function parsePath(path) {
    var keys = [];
    var index = -1;
    var mode = BEFORE_PATH;
    var c,
        newChar,
        key,
        type,
        transition,
        action,
        typeMap;
    var actions = [];
    actions[PUSH] = function() {
      if (key === undefined) {
        return;
      }
      keys.push(key);
      key = undefined;
    };
    actions[APPEND] = function() {
      if (key === undefined) {
        key = newChar;
      } else {
        key += newChar;
      }
    };
    function maybeUnescapeQuote() {
      var nextChar = path[index + 1];
      if ((mode === IN_SINGLE_QUOTE && nextChar === "'") || (mode === IN_DOUBLE_QUOTE && nextChar === '"')) {
        index++;
        newChar = nextChar;
        actions[APPEND]();
        return true;
      }
    }
    while (mode != null) {
      index++;
      c = path[index];
      if (c === '\\' && maybeUnescapeQuote()) {
        continue;
      }
      type = getPathCharType(c);
      typeMap = pathStateMachine[mode];
      transition = typeMap[type] || typeMap['else'] || ERROR;
      if (transition === ERROR) {
        return;
      }
      mode = transition[0];
      action = actions[transition[1]];
      if (action) {
        newChar = transition[2];
        newChar = newChar === undefined ? c : newChar === '*' ? newChar + c : newChar;
        action();
      }
      if (mode === AFTER_PATH) {
        keys.raw = path;
        return keys;
      }
    }
  }
  function formatAccessor(key) {
    if (identRE.test(key)) {
      return '.' + key;
    } else if (+key === key >>> 0) {
      return '[' + key + ']';
    } else if (key.charAt(0) === '*') {
      return '[o' + formatAccessor(key.slice(1)) + ']';
    } else {
      return '["' + key.replace(/"/g, '\\"') + '"]';
    }
  }
  exports.compileGetter = function(path) {
    var body = 'return o' + path.map(formatAccessor).join('');
    return new Function('o', body);
  };
  exports.parse = function(path) {
    var hit = pathCache.get(path);
    if (!hit) {
      hit = parsePath(path);
      if (hit) {
        hit.get = exports.compileGetter(hit);
        pathCache.put(path, hit);
      }
    }
    return hit;
  };
  exports.get = function(obj, path) {
    path = exports.parse(path);
    if (path) {
      return path.get(obj);
    }
  };
  var warnNonExistent;
  if (process.env.NODE_ENV !== 'production') {
    warnNonExistent = function(path) {
      _.warn('You are setting a non-existent path "' + path.raw + '" ' + 'on a vm instance. Consider pre-initializing the property ' + 'with the "data" option for more reliable reactivity ' + 'and better performance.');
    };
  }
  exports.set = function(obj, path, val) {
    var original = obj;
    if (typeof path === 'string') {
      path = exports.parse(path);
    }
    if (!path || !_.isObject(obj)) {
      return false;
    }
    var last,
        key;
    for (var i = 0,
        l = path.length; i < l; i++) {
      last = obj;
      key = path[i];
      if (key.charAt(0) === '*') {
        key = original[key.slice(1)];
      }
      if (i < l - 1) {
        obj = obj[key];
        if (!_.isObject(obj)) {
          obj = {};
          if (process.env.NODE_ENV !== 'production' && last._isVue) {
            warnNonExistent(path);
          }
          _.set(last, key, obj);
        }
      } else {
        if (_.isArray(obj)) {
          obj.$set(key, val);
        } else if (key in obj) {
          obj[key] = val;
        } else {
          if (process.env.NODE_ENV !== 'production' && obj._isVue) {
            warnNonExistent(path);
          }
          _.set(obj, key, val);
        }
      }
    }
    return true;
  };
})(require('process'));
