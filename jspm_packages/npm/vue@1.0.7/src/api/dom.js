/* */ 
var _ = require('../util/index');
var transition = require('../transition/index');
exports.$nextTick = function(fn) {
  _.nextTick(fn, this);
};
exports.$appendTo = function(target, cb, withTransition) {
  return insert(this, target, cb, withTransition, append, transition.append);
};
exports.$prependTo = function(target, cb, withTransition) {
  target = query(target);
  if (target.hasChildNodes()) {
    this.$before(target.firstChild, cb, withTransition);
  } else {
    this.$appendTo(target, cb, withTransition);
  }
  return this;
};
exports.$before = function(target, cb, withTransition) {
  return insert(this, target, cb, withTransition, before, transition.before);
};
exports.$after = function(target, cb, withTransition) {
  target = query(target);
  if (target.nextSibling) {
    this.$before(target.nextSibling, cb, withTransition);
  } else {
    this.$appendTo(target.parentNode, cb, withTransition);
  }
  return this;
};
exports.$remove = function(cb, withTransition) {
  if (!this.$el.parentNode) {
    return cb && cb();
  }
  var inDoc = this._isAttached && _.inDoc(this.$el);
  if (!inDoc)
    withTransition = false;
  var self = this;
  var realCb = function() {
    if (inDoc)
      self._callHook('detached');
    if (cb)
      cb();
  };
  if (this._isFragment) {
    _.removeNodeRange(this._fragmentStart, this._fragmentEnd, this, this._fragment, realCb);
  } else {
    var op = withTransition === false ? remove : transition.remove;
    op(this.$el, this, realCb);
  }
  return this;
};
function insert(vm, target, cb, withTransition, op1, op2) {
  target = query(target);
  var targetIsDetached = !_.inDoc(target);
  var op = withTransition === false || targetIsDetached ? op1 : op2;
  var shouldCallHook = !targetIsDetached && !vm._isAttached && !_.inDoc(vm.$el);
  if (vm._isFragment) {
    _.mapNodeRange(vm._fragmentStart, vm._fragmentEnd, function(node) {
      op(node, target, vm);
    });
    cb && cb();
  } else {
    op(vm.$el, target, vm, cb);
  }
  if (shouldCallHook) {
    vm._callHook('attached');
  }
  return vm;
}
function query(el) {
  return typeof el === 'string' ? document.querySelector(el) : el;
}
function append(el, target, vm, cb) {
  target.appendChild(el);
  if (cb)
    cb();
}
function before(el, target, vm, cb) {
  _.before(el, target);
  if (cb)
    cb();
}
function remove(el, vm, cb) {
  _.remove(el);
  if (cb)
    cb();
}
