/* */ 
(function(process) {
  var _ = require('../util/index');
  var compiler = require('../compiler/index');
  var Observer = require('../observer/index');
  var Dep = require('../observer/dep');
  var Watcher = require('../watcher');
  exports._initState = function() {
    this._initProps();
    this._initMeta();
    this._initMethods();
    this._initData();
    this._initComputed();
  };
  exports._initProps = function() {
    var options = this.$options;
    var el = options.el;
    var props = options.props;
    if (props && !el) {
      process.env.NODE_ENV !== 'production' && _.warn('Props will not be compiled if no `el` option is ' + 'provided at instantiation.');
    }
    el = options.el = _.query(el);
    this._propsUnlinkFn = el && el.nodeType === 1 && props ? compiler.compileAndLinkProps(this, el, props, this._scope) : null;
  };
  exports._initData = function() {
    var propsData = this._data;
    var optionsDataFn = this.$options.data;
    var optionsData = optionsDataFn && optionsDataFn();
    if (optionsData) {
      this._data = optionsData;
      for (var prop in propsData) {
        if (process.env.NODE_ENV !== 'production' && optionsData.hasOwnProperty(prop)) {
          _.warn('Data field "' + prop + '" is already defined ' + 'as a prop. Use prop default value instead.');
        }
        if (this._props[prop].raw !== null || !optionsData.hasOwnProperty(prop)) {
          _.set(optionsData, prop, propsData[prop]);
        }
      }
    }
    var data = this._data;
    var keys = Object.keys(data);
    var i,
        key;
    i = keys.length;
    while (i--) {
      key = keys[i];
      this._proxy(key);
    }
    Observer.create(data, this);
  };
  exports._setData = function(newData) {
    newData = newData || {};
    var oldData = this._data;
    this._data = newData;
    var keys,
        key,
        i;
    keys = Object.keys(oldData);
    i = keys.length;
    while (i--) {
      key = keys[i];
      if (!(key in newData)) {
        this._unproxy(key);
      }
    }
    keys = Object.keys(newData);
    i = keys.length;
    while (i--) {
      key = keys[i];
      if (!this.hasOwnProperty(key)) {
        this._proxy(key);
      }
    }
    oldData.__ob__.removeVm(this);
    Observer.create(newData, this);
    this._digest();
  };
  exports._proxy = function(key) {
    if (!_.isReserved(key)) {
      var self = this;
      Object.defineProperty(self, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter() {
          return self._data[key];
        },
        set: function proxySetter(val) {
          self._data[key] = val;
        }
      });
    }
  };
  exports._unproxy = function(key) {
    if (!_.isReserved(key)) {
      delete this[key];
    }
  };
  exports._digest = function() {
    for (var i = 0,
        l = this._watchers.length; i < l; i++) {
      this._watchers[i].update(true);
    }
  };
  function noop() {}
  exports._initComputed = function() {
    var computed = this.$options.computed;
    if (computed) {
      for (var key in computed) {
        var userDef = computed[key];
        var def = {
          enumerable: true,
          configurable: true
        };
        if (typeof userDef === 'function') {
          def.get = makeComputedGetter(userDef, this);
          def.set = noop;
        } else {
          def.get = userDef.get ? userDef.cache !== false ? makeComputedGetter(userDef.get, this) : _.bind(userDef.get, this) : noop;
          def.set = userDef.set ? _.bind(userDef.set, this) : noop;
        }
        Object.defineProperty(this, key, def);
      }
    }
  };
  function makeComputedGetter(getter, owner) {
    var watcher = new Watcher(owner, getter, null, {lazy: true});
    return function computedGetter() {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value;
    };
  }
  exports._initMethods = function() {
    var methods = this.$options.methods;
    if (methods) {
      for (var key in methods) {
        this[key] = _.bind(methods[key], this);
      }
    }
  };
  exports._initMeta = function() {
    var metas = this.$options._meta;
    if (metas) {
      for (var key in metas) {
        _.defineReactive(this, key, metas[key]);
      }
    }
  };
})(require('process'));
