/* */ 
(function(process) {
  var _ = require('../util/index');
  var config = require('../config');
  exports.util = _;
  exports.config = config;
  exports.set = _.set;
  exports.delete = _.delete;
  exports.nextTick = _.nextTick;
  exports.compiler = require('../compiler/index');
  exports.FragmentFactory = require('../fragment/factory');
  exports.internalDirectives = require('../directives/internal/index');
  exports.parsers = {
    path: require('../parsers/path'),
    text: require('../parsers/text'),
    template: require('../parsers/template'),
    directive: require('../parsers/directive'),
    expression: require('../parsers/expression')
  };
  exports.cid = 0;
  var cid = 1;
  exports.extend = function(extendOptions) {
    extendOptions = extendOptions || {};
    var Super = this;
    var isFirstExtend = Super.cid === 0;
    if (isFirstExtend && extendOptions._Ctor) {
      return extendOptions._Ctor;
    }
    var name = extendOptions.name || Super.options.name;
    var Sub = createClass(name || 'VueComponent');
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    Sub.options = _.mergeOptions(Super.options, extendOptions);
    Sub['super'] = Super;
    Sub.extend = Super.extend;
    config._assetTypes.forEach(function(type) {
      Sub[type] = Super[type];
    });
    if (name) {
      Sub.options.components[name] = Sub;
    }
    if (isFirstExtend) {
      extendOptions._Ctor = Sub;
    }
    return Sub;
  };
  function createClass(name) {
    return new Function('return function ' + _.classify(name) + ' (options) { this._init(options) }')();
  }
  exports.use = function(plugin) {
    if (plugin.installed) {
      return;
    }
    var args = _.toArray(arguments, 1);
    args.unshift(this);
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args);
    } else {
      plugin.apply(null, args);
    }
    plugin.installed = true;
    return this;
  };
  exports.mixin = function(mixin) {
    var Vue = _.Vue;
    Vue.options = _.mergeOptions(Vue.options, mixin);
  };
  config._assetTypes.forEach(function(type) {
    exports[type] = function(id, definition) {
      if (!definition) {
        return this.options[type + 's'][id];
      } else {
        if (process.env.NODE_ENV !== 'production') {
          if (type === 'component' && _.commonTagRE.test(id)) {
            _.warn('Do not use built-in HTML elements as component ' + 'id: ' + id);
          }
        }
        if (type === 'component' && _.isPlainObject(definition)) {
          definition.name = id;
          definition = _.Vue.extend(definition);
        }
        this.options[type + 's'][id] = definition;
        return definition;
      }
    };
  });
})(require('process'));
