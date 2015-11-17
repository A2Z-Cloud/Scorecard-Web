/* */ 
var _ = require('../util/index');
var Path = require('../parsers/path');
var toArray = require('../directives/public/for')._postProcess;
exports.limitBy = function(arr, n, offset) {
  offset = offset ? parseInt(offset, 10) : 0;
  return typeof n === 'number' ? arr.slice(offset, offset + n) : arr;
};
exports.filterBy = function(arr, search, delimiter) {
  arr = toArray(arr);
  if (search == null) {
    return arr;
  }
  if (typeof search === 'function') {
    return arr.filter(search);
  }
  search = ('' + search).toLowerCase();
  var n = delimiter === 'in' ? 3 : 2;
  var keys = _.toArray(arguments, n).reduce(function(prev, cur) {
    return prev.concat(cur);
  }, []);
  var res = [];
  var item,
      key,
      val,
      j;
  for (var i = 0,
      l = arr.length; i < l; i++) {
    item = arr[i];
    val = (item && item.$value) || item;
    j = keys.length;
    if (j) {
      while (j--) {
        key = keys[j];
        if ((key === '$key' && contains(item.$key, search)) || contains(Path.get(val, key), search)) {
          res.push(item);
          break;
        }
      }
    } else if (contains(item, search)) {
      res.push(item);
    }
  }
  return res;
};
exports.orderBy = function(arr, sortKey, reverse) {
  arr = toArray(arr);
  if (!sortKey) {
    return arr;
  }
  var order = (reverse && reverse < 0) ? -1 : 1;
  return arr.slice().sort(function(a, b) {
    if (sortKey !== '$key') {
      if (_.isObject(a) && '$value' in a)
        a = a.$value;
      if (_.isObject(b) && '$value' in b)
        b = b.$value;
    }
    a = _.isObject(a) ? Path.get(a, sortKey) : a;
    b = _.isObject(b) ? Path.get(b, sortKey) : b;
    return a === b ? 0 : a > b ? order : -order;
  });
};
function contains(val, search) {
  var i;
  if (_.isPlainObject(val)) {
    var keys = Object.keys(val);
    i = keys.length;
    while (i--) {
      if (contains(val[keys[i]], search)) {
        return true;
      }
    }
  } else if (_.isArray(val)) {
    i = val.length;
    while (i--) {
      if (contains(val[i], search)) {
        return true;
      }
    }
  } else if (val != null) {
    return val.toString().toLowerCase().indexOf(search) > -1;
  }
}
