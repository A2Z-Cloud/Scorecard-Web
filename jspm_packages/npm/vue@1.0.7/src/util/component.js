/* */ 
(function(process) {
  var _ = require('./index');
  exports.commonTagRE = /^(div|p|span|img|a|b|i|br|ul|ol|li|h1|h2|h3|h4|h5|h6|code|pre|table|th|td|tr|form|label|input|select|option|nav|article|section|header|footer)$/;
  exports.checkComponent = function(el, options) {
    var tag = el.tagName.toLowerCase();
    var hasAttrs = el.hasAttributes();
    if (!exports.commonTagRE.test(tag) && tag !== 'component') {
      if (_.resolveAsset(options, 'components', tag)) {
        return {id: tag};
      } else {
        var is = hasAttrs && getIsBinding(el);
        if (is) {
          return is;
        } else if (process.env.NODE_ENV !== 'production') {
          if (tag.indexOf('-') > -1 || (/HTMLUnknownElement/.test(el.toString()) && !/^(data|time|rtc|rb)$/.test(tag))) {
            _.warn('Unknown custom element: <' + tag + '> - did you ' + 'register the component correctly?');
          }
        }
      }
    } else if (hasAttrs) {
      return getIsBinding(el);
    }
  };
  function getIsBinding(el) {
    var exp = _.attr(el, 'is');
    if (exp != null) {
      return {id: exp};
    } else {
      exp = _.getBindAttr(el, 'is');
      if (exp != null) {
        return {
          id: exp,
          dynamic: true
        };
      }
    }
  }
  exports.initProp = function(vm, prop, value) {
    if (exports.assertProp(prop, value)) {
      var key = prop.path;
      vm[key] = vm._data[key] = value;
    }
  };
  exports.assertProp = function(prop, value) {
    if (prop.raw === null && !prop.required) {
      return true;
    }
    var options = prop.options;
    var type = options.type;
    var valid = true;
    var expectedType;
    if (type) {
      if (type === String) {
        expectedType = 'string';
        valid = typeof value === expectedType;
      } else if (type === Number) {
        expectedType = 'number';
        valid = typeof value === 'number';
      } else if (type === Boolean) {
        expectedType = 'boolean';
        valid = typeof value === 'boolean';
      } else if (type === Function) {
        expectedType = 'function';
        valid = typeof value === 'function';
      } else if (type === Object) {
        expectedType = 'object';
        valid = _.isPlainObject(value);
      } else if (type === Array) {
        expectedType = 'array';
        valid = _.isArray(value);
      } else {
        valid = value instanceof type;
      }
    }
    if (!valid) {
      process.env.NODE_ENV !== 'production' && _.warn('Invalid prop: type check failed for ' + prop.path + '="' + prop.raw + '".' + ' Expected ' + formatType(expectedType) + ', got ' + formatValue(value) + '.');
      return false;
    }
    var validator = options.validator;
    if (validator) {
      if (!validator.call(null, value)) {
        process.env.NODE_ENV !== 'production' && _.warn('Invalid prop: custom validator check failed for ' + prop.path + '="' + prop.raw + '"');
        return false;
      }
    }
    return true;
  };
  function formatType(val) {
    return val ? val.charAt(0).toUpperCase() + val.slice(1) : 'custom type';
  }
  function formatValue(val) {
    return Object.prototype.toString.call(val).slice(8, -1);
  }
})(require('process'));
