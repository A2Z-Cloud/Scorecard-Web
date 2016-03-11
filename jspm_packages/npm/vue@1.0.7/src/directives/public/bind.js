/* */ 
(function(process) {
  var _ = require('../../util/index');
  var xlinkNS = 'http://www.w3.org/1999/xlink';
  var xlinkRE = /^xlink:/;
  var inputProps = {
    value: 1,
    checked: 1,
    selected: 1
  };
  var modelProps = {
    value: '_value',
    'true-value': '_trueValue',
    'false-value': '_falseValue'
  };
  var disallowedInterpAttrRE = /^v-|^:|^@|^(is|transition|transition-mode|debounce|track-by|stagger|enter-stagger|leave-stagger)$/;
  module.exports = {
    priority: 850,
    bind: function() {
      var attr = this.arg;
      var tag = this.el.tagName;
      if (!attr) {
        this.deep = true;
      }
      if (this.descriptor.interp) {
        if (disallowedInterpAttrRE.test(attr) || (attr === 'name' && (tag === 'PARTIAL' || tag === 'SLOT'))) {
          process.env.NODE_ENV !== 'production' && _.warn(attr + '="' + this.descriptor.raw + '": ' + 'attribute interpolation is not allowed in Vue.js ' + 'directives and special attributes.');
          this.el.removeAttribute(attr);
          this.invalid = true;
        }
        if (process.env.NODE_ENV !== 'production') {
          var raw = attr + '="' + this.descriptor.raw + '": ';
          if (attr === 'src') {
            _.warn(raw + 'interpolation in "src" attribute will cause ' + 'a 404 request. Use v-bind:src instead.');
          }
          if (attr === 'style') {
            _.warn(raw + 'interpolation in "style" attribute will cause ' + 'the attribute to be discarded in Internet Explorer. ' + 'Use v-bind:style instead.');
          }
        }
      }
    },
    update: function(value) {
      if (this.invalid) {
        return;
      }
      var attr = this.arg;
      if (this.arg) {
        this.handleSingle(attr, value);
      } else {
        this.handleObject(value || {});
      }
    },
    handleObject: require('../internal/style').handleObject,
    handleSingle: function(attr, value) {
      if (inputProps[attr] && attr in this.el) {
        this.el[attr] = attr === 'value' ? (value || '') : value;
      }
      var modelProp = modelProps[attr];
      if (modelProp) {
        this.el[modelProp] = value;
        var model = this.el.__v_model;
        if (model) {
          model.listener();
        }
      }
      if (attr === 'value' && this.el.tagName === 'TEXTAREA') {
        this.el.removeAttribute(attr);
        return;
      }
      if (value != null && value !== false) {
        if (xlinkRE.test(attr)) {
          this.el.setAttributeNS(xlinkNS, attr, value);
        } else {
          this.el.setAttribute(attr, value);
        }
      } else {
        this.el.removeAttribute(attr);
      }
    }
  };
})(require('process'));
