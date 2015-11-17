/* */ 
var _ = require('../util/index');
exports.$on = function(event, fn) {
  (this._events[event] || (this._events[event] = [])).push(fn);
  modifyListenerCount(this, event, 1);
  return this;
};
exports.$once = function(event, fn) {
  var self = this;
  function on() {
    self.$off(event, on);
    fn.apply(this, arguments);
  }
  on.fn = fn;
  this.$on(event, on);
  return this;
};
exports.$off = function(event, fn) {
  var cbs;
  if (!arguments.length) {
    if (this.$parent) {
      for (event in this._events) {
        cbs = this._events[event];
        if (cbs) {
          modifyListenerCount(this, event, -cbs.length);
        }
      }
    }
    this._events = {};
    return this;
  }
  cbs = this._events[event];
  if (!cbs) {
    return this;
  }
  if (arguments.length === 1) {
    modifyListenerCount(this, event, -cbs.length);
    this._events[event] = null;
    return this;
  }
  var cb;
  var i = cbs.length;
  while (i--) {
    cb = cbs[i];
    if (cb === fn || cb.fn === fn) {
      modifyListenerCount(this, event, -1);
      cbs.splice(i, 1);
      break;
    }
  }
  return this;
};
exports.$emit = function(event) {
  var cbs = this._events[event];
  this._shouldPropagate = !cbs;
  if (cbs) {
    cbs = cbs.length > 1 ? _.toArray(cbs) : cbs;
    var args = _.toArray(arguments, 1);
    for (var i = 0,
        l = cbs.length; i < l; i++) {
      var res = cbs[i].apply(this, args);
      if (res === true) {
        this._shouldPropagate = true;
      }
    }
  }
  return this;
};
exports.$broadcast = function(event) {
  if (!this._eventsCount[event])
    return;
  var children = this.$children;
  for (var i = 0,
      l = children.length; i < l; i++) {
    var child = children[i];
    child.$emit.apply(child, arguments);
    if (child._shouldPropagate) {
      child.$broadcast.apply(child, arguments);
    }
  }
  return this;
};
exports.$dispatch = function() {
  this.$emit.apply(this, arguments);
  var parent = this.$parent;
  while (parent) {
    parent.$emit.apply(parent, arguments);
    parent = parent._shouldPropagate ? parent.$parent : null;
  }
  return this;
};
var hookRE = /^hook:/;
function modifyListenerCount(vm, event, count) {
  var parent = vm.$parent;
  if (!parent || !count || hookRE.test(event))
    return;
  while (parent) {
    parent._eventsCount[event] = (parent._eventsCount[event] || 0) + count;
    parent = parent.$parent;
  }
}
