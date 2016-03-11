/* */ 
var _ = require('../util/index');
exports.append = function(el, target, vm, cb) {
  apply(el, 1, function() {
    target.appendChild(el);
  }, vm, cb);
};
exports.before = function(el, target, vm, cb) {
  apply(el, 1, function() {
    _.before(el, target);
  }, vm, cb);
};
exports.remove = function(el, vm, cb) {
  apply(el, -1, function() {
    _.remove(el);
  }, vm, cb);
};
var apply = exports.apply = function(el, direction, op, vm, cb) {
  var transition = el.__v_trans;
  if (!transition || (!transition.hooks && !_.transitionEndEvent) || !vm._isCompiled || (vm.$parent && !vm.$parent._isCompiled)) {
    op();
    if (cb)
      cb();
    return;
  }
  var action = direction > 0 ? 'enter' : 'leave';
  transition[action](op, cb);
};
