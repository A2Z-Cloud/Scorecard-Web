/* */ 
var _ = require('../util/index');
var Watcher = require('../watcher');
var Path = require('../parsers/path');
var textParser = require('../parsers/text');
var dirParser = require('../parsers/directive');
var expParser = require('../parsers/expression');
var filterRE = /[^|]\|[^|]/;
exports.$get = function(exp, asStatement) {
  var res = expParser.parse(exp);
  if (res) {
    if (asStatement && !expParser.isSimplePath(exp)) {
      var self = this;
      return function statementHandler() {
        res.get.call(self, self);
      };
    } else {
      try {
        return res.get.call(this, this);
      } catch (e) {}
    }
  }
};
exports.$set = function(exp, val) {
  var res = expParser.parse(exp, true);
  if (res && res.set) {
    res.set.call(this, this, val);
  }
};
exports.$delete = function(key) {
  _.delete(this._data, key);
};
exports.$watch = function(expOrFn, cb, options) {
  var vm = this;
  var parsed;
  if (typeof expOrFn === 'string') {
    parsed = dirParser.parse(expOrFn);
    expOrFn = parsed.expression;
  }
  var watcher = new Watcher(vm, expOrFn, cb, {
    deep: options && options.deep,
    filters: parsed && parsed.filters
  });
  if (options && options.immediate) {
    cb.call(vm, watcher.value);
  }
  return function unwatchFn() {
    watcher.teardown();
  };
};
exports.$eval = function(text, asStatement) {
  if (filterRE.test(text)) {
    var dir = dirParser.parse(text);
    var val = this.$get(dir.expression, asStatement);
    return dir.filters ? this._applyFilters(val, null, dir.filters) : val;
  } else {
    return this.$get(text, asStatement);
  }
};
exports.$interpolate = function(text) {
  var tokens = textParser.parse(text);
  var vm = this;
  if (tokens) {
    if (tokens.length === 1) {
      return vm.$eval(tokens[0].value) + '';
    } else {
      return tokens.map(function(token) {
        return token.tag ? vm.$eval(token.value) : token.value;
      }).join('');
    }
  } else {
    return text;
  }
};
exports.$log = function(path) {
  var data = path ? Path.get(this._data, path) : this._data;
  if (data) {
    data = clean(data);
  }
  if (!path) {
    for (var key in this.$options.computed) {
      data[key] = clean(this[key]);
    }
  }
  console.log(data);
};
function clean(obj) {
  return JSON.parse(JSON.stringify(obj));
}
