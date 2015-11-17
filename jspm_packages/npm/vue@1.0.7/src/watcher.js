/* */ 
(function(process) {
  var _ = require('./util/index');
  var config = require('./config');
  var Dep = require('./observer/dep');
  var expParser = require('./parsers/expression');
  var batcher = require('./batcher');
  var uid = 0;
  function Watcher(vm, expOrFn, cb, options) {
    if (options) {
      _.extend(this, options);
    }
    var isFn = typeof expOrFn === 'function';
    this.vm = vm;
    vm._watchers.push(this);
    this.expression = isFn ? expOrFn.toString() : expOrFn;
    this.cb = cb;
    this.id = ++uid;
    this.active = true;
    this.dirty = this.lazy;
    this.deps = Object.create(null);
    this.newDeps = null;
    this.prevError = null;
    if (isFn) {
      this.getter = expOrFn;
      this.setter = undefined;
    } else {
      var res = expParser.parse(expOrFn, this.twoWay);
      this.getter = res.get;
      this.setter = res.set;
    }
    this.value = this.lazy ? undefined : this.get();
    this.queued = this.shallow = false;
  }
  Watcher.prototype.addDep = function(dep) {
    var id = dep.id;
    if (!this.newDeps[id]) {
      this.newDeps[id] = dep;
      if (!this.deps[id]) {
        this.deps[id] = dep;
        dep.addSub(this);
      }
    }
  };
  Watcher.prototype.get = function() {
    this.beforeGet();
    var scope = this.scope || this.vm;
    var value;
    try {
      value = this.getter.call(scope, scope);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production' && config.warnExpressionErrors) {
        _.warn('Error when evaluating expression "' + this.expression + '". ' + (config.debug ? '' : 'Turn on debug mode to see stack trace.'), e);
      }
    }
    if (this.deep) {
      traverse(value);
    }
    if (this.preProcess) {
      value = this.preProcess(value);
    }
    if (this.filters) {
      value = scope._applyFilters(value, null, this.filters, false);
    }
    if (this.postProcess) {
      value = this.postProcess(value);
    }
    this.afterGet();
    return value;
  };
  Watcher.prototype.set = function(value) {
    var scope = this.scope || this.vm;
    if (this.filters) {
      value = scope._applyFilters(value, this.value, this.filters, true);
    }
    try {
      this.setter.call(scope, scope, value);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production' && config.warnExpressionErrors) {
        _.warn('Error when evaluating setter "' + this.expression + '"', e);
      }
    }
    var forContext = scope.$forContext;
    if (process.env.NODE_ENV !== 'production') {
      if (forContext && forContext.filters && (new RegExp(forContext.alias + '\\b')).test(this.expression)) {
        _.warn('It seems you are using two-way binding on ' + 'a v-for alias (' + this.expression + '), and the ' + 'v-for has filters. This will not work properly. ' + 'Either remove the filters or use an array of ' + 'objects and bind to object properties instead.');
      }
    }
    if (forContext && forContext.alias === this.expression && !forContext.filters) {
      if (scope.$key) {
        forContext.rawValue[scope.$key] = value;
      } else {
        forContext.rawValue.$set(scope.$index, value);
      }
    }
  };
  Watcher.prototype.beforeGet = function() {
    Dep.target = this;
    this.newDeps = Object.create(null);
  };
  Watcher.prototype.afterGet = function() {
    Dep.target = null;
    var ids = Object.keys(this.deps);
    var i = ids.length;
    while (i--) {
      var id = ids[i];
      if (!this.newDeps[id]) {
        this.deps[id].removeSub(this);
      }
    }
    this.deps = this.newDeps;
  };
  Watcher.prototype.update = function(shallow) {
    if (this.lazy) {
      this.dirty = true;
    } else if (this.sync || !config.async) {
      this.run();
    } else {
      this.shallow = this.queued ? shallow ? this.shallow : false : !!shallow;
      this.queued = true;
      if (process.env.NODE_ENV !== 'production' && config.debug) {
        this.prevError = new Error('[vue] async stack trace');
      }
      batcher.push(this);
    }
  };
  Watcher.prototype.run = function() {
    if (this.active) {
      var value = this.get();
      if (value !== this.value || ((_.isArray(value) || this.deep) && !this.shallow)) {
        var oldValue = this.value;
        this.value = value;
        var prevError = this.prevError;
        if (process.env.NODE_ENV !== 'production' && config.debug && prevError) {
          this.prevError = null;
          try {
            this.cb.call(this.vm, value, oldValue);
          } catch (e) {
            _.nextTick(function() {
              throw prevError;
            }, 0);
            throw e;
          }
        } else {
          this.cb.call(this.vm, value, oldValue);
        }
      }
      this.queued = this.shallow = false;
    }
  };
  Watcher.prototype.evaluate = function() {
    var current = Dep.target;
    this.value = this.get();
    this.dirty = false;
    Dep.target = current;
  };
  Watcher.prototype.depend = function() {
    var depIds = Object.keys(this.deps);
    var i = depIds.length;
    while (i--) {
      this.deps[depIds[i]].depend();
    }
  };
  Watcher.prototype.teardown = function() {
    if (this.active) {
      if (!this.vm._isBeingDestroyed) {
        this.vm._watchers.$remove(this);
      }
      var depIds = Object.keys(this.deps);
      var i = depIds.length;
      while (i--) {
        this.deps[depIds[i]].removeSub(this);
      }
      this.active = false;
      this.vm = this.cb = this.value = null;
    }
  };
  function traverse(val) {
    var i,
        keys;
    if (_.isArray(val)) {
      i = val.length;
      while (i--)
        traverse(val[i]);
    } else if (_.isObject(val)) {
      keys = Object.keys(val);
      i = keys.length;
      while (i--)
        traverse(val[keys[i]]);
    }
  }
  module.exports = Watcher;
})(require('process'));
