/* */ 
var _ = require('../../../util/index');
module.exports = {
  bind: function() {
    var self = this;
    var el = this.el;
    this.forceUpdate = function() {
      if (self._watcher) {
        self.update(self._watcher.get());
      }
    };
    var multiple = this.multiple = el.hasAttribute('multiple');
    this.listener = function() {
      var value = getValue(el, multiple);
      value = self.params.number ? _.isArray(value) ? value.map(_.toNumber) : _.toNumber(value) : value;
      self.set(value);
    };
    this.on('change', this.listener);
    var initValue = getValue(el, multiple, true);
    if ((multiple && initValue.length) || (!multiple && initValue !== null)) {
      this.afterBind = this.listener;
    }
    this.vm.$on('hook:attached', this.forceUpdate);
  },
  update: function(value) {
    var el = this.el;
    el.selectedIndex = -1;
    var multi = this.multiple && _.isArray(value);
    var options = el.options;
    var i = options.length;
    var op,
        val;
    while (i--) {
      op = options[i];
      val = op.hasOwnProperty('_value') ? op._value : op.value;
      op.selected = multi ? indexOf(value, val) > -1 : _.looseEqual(value, val);
    }
  },
  unbind: function() {
    this.vm.$off('hook:attached', this.forceUpdate);
  }
};
function getValue(el, multi, init) {
  var res = multi ? [] : null;
  var op,
      val,
      selected;
  for (var i = 0,
      l = el.options.length; i < l; i++) {
    op = el.options[i];
    selected = init ? op.hasAttribute('selected') : op.selected;
    if (selected) {
      val = op.hasOwnProperty('_value') ? op._value : op.value;
      if (multi) {
        res.push(val);
      } else {
        return val;
      }
    }
  }
  return res;
}
function indexOf(arr, val) {
  var i = arr.length;
  while (i--) {
    if (_.looseEqual(arr[i], val)) {
      return i;
    }
  }
  return -1;
}
