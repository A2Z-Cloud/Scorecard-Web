/* */ 
var _ = require('../../util/index');
var prefixes = ['-webkit-', '-moz-', '-ms-'];
var camelPrefixes = ['Webkit', 'Moz', 'ms'];
var importantRE = /!important;?$/;
var testEl = null;
var propCache = {};
module.exports = {
  deep: true,
  update: function(value) {
    if (typeof value === 'string') {
      this.el.style.cssText = value;
    } else if (_.isArray(value)) {
      this.handleObject(value.reduce(_.extend, {}));
    } else {
      this.handleObject(value || {});
    }
  },
  handleObject: function(value) {
    var cache = this.cache || (this.cache = {});
    var name,
        val;
    for (name in cache) {
      if (!(name in value)) {
        this.handleSingle(name, null);
        delete cache[name];
      }
    }
    for (name in value) {
      val = value[name];
      if (val !== cache[name]) {
        cache[name] = val;
        this.handleSingle(name, val);
      }
    }
  },
  handleSingle: function(prop, value) {
    prop = normalize(prop);
    if (!prop)
      return;
    if (value != null)
      value += '';
    if (value) {
      var isImportant = importantRE.test(value) ? 'important' : '';
      if (isImportant) {
        value = value.replace(importantRE, '').trim();
      }
      this.el.style.setProperty(prop, value, isImportant);
    } else {
      this.el.style.removeProperty(prop);
    }
  }
};
function normalize(prop) {
  if (propCache[prop]) {
    return propCache[prop];
  }
  var res = prefix(prop);
  propCache[prop] = propCache[res] = res;
  return res;
}
function prefix(prop) {
  prop = _.hyphenate(prop);
  var camel = _.camelize(prop);
  var upper = camel.charAt(0).toUpperCase() + camel.slice(1);
  if (!testEl) {
    testEl = document.createElement('div');
  }
  if (camel in testEl.style) {
    return prop;
  }
  var i = prefixes.length;
  var prefixed;
  while (i--) {
    prefixed = camelPrefixes[i] + upper;
    if (prefixed in testEl.style) {
      return prefixes[i] + prop;
    }
  }
}
