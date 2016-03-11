/* */ 
var _ = require('../../../util/index');
module.exports = {
  bind: function() {
    var self = this;
    var el = this.el;
    var isRange = el.type === 'range';
    var lazy = this.params.lazy;
    var number = this.params.number;
    var debounce = this.params.debounce;
    var composing = false;
    if (!_.isAndroid && !isRange) {
      this.on('compositionstart', function() {
        composing = true;
      });
      this.on('compositionend', function() {
        composing = false;
        if (!lazy) {
          self.listener();
        }
      });
    }
    this.focused = false;
    if (!isRange) {
      this.on('focus', function() {
        self.focused = true;
      });
      this.on('blur', function() {
        self.focused = false;
        self.listener();
      });
    }
    this.listener = function() {
      if (composing)
        return;
      var val = number || isRange ? _.toNumber(el.value) : el.value;
      self.set(val);
      _.nextTick(function() {
        if (self._bound && !self.focused) {
          self.update(self._watcher.value);
        }
      });
    };
    if (debounce) {
      this.listener = _.debounce(this.listener, debounce);
    }
    this.hasjQuery = typeof jQuery === 'function';
    if (this.hasjQuery) {
      jQuery(el).on('change', this.listener);
      if (!lazy) {
        jQuery(el).on('input', this.listener);
      }
    } else {
      this.on('change', this.listener);
      if (!lazy) {
        this.on('input', this.listener);
      }
    }
    if (!lazy && _.isIE9) {
      this.on('cut', function() {
        _.nextTick(self.listener);
      });
      this.on('keyup', function(e) {
        if (e.keyCode === 46 || e.keyCode === 8) {
          self.listener();
        }
      });
    }
    if (el.hasAttribute('value') || (el.tagName === 'TEXTAREA' && el.value.trim())) {
      this.afterBind = this.listener;
    }
  },
  update: function(value) {
    this.el.value = _.toString(value);
  },
  unbind: function() {
    var el = this.el;
    if (this.hasjQuery) {
      jQuery(el).off('change', this.listener);
      jQuery(el).off('input', this.listener);
    }
  }
};
