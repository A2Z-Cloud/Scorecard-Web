/* */ 
(function(process) {
  var _ = require('./util/index');
  var Watcher = require('./watcher');
  var expParser = require('./parsers/expression');
  function noop() {}
  function Directive(descriptor, vm, el, host, scope, frag) {
    this.vm = vm;
    this.el = el;
    this.descriptor = descriptor;
    this.name = descriptor.name;
    this.expression = descriptor.expression;
    this.arg = descriptor.arg;
    this.modifiers = descriptor.modifiers;
    this.filters = descriptor.filters;
    this.literal = this.modifiers && this.modifiers.literal;
    this._locked = false;
    this._bound = false;
    this._listeners = null;
    this._host = host;
    this._scope = scope;
    this._frag = frag;
    if (process.env.NODE_ENV !== 'production' && this.el) {
      this.el._vue_directives = this.el._vue_directives || [];
      this.el._vue_directives.push(this);
    }
  }
  Directive.prototype._bind = function() {
    var name = this.name;
    var descriptor = this.descriptor;
    if ((name !== 'cloak' || this.vm._isCompiled) && this.el && this.el.removeAttribute) {
      var attr = descriptor.attr || ('v-' + name);
      this.el.removeAttribute(attr);
    }
    var def = descriptor.def;
    if (typeof def === 'function') {
      this.update = def;
    } else {
      _.extend(this, def);
    }
    this._setupParams();
    if (this.bind) {
      this.bind();
    }
    if (this.literal) {
      this.update && this.update(descriptor.raw);
    } else if ((this.expression || this.modifiers) && (this.update || this.twoWay) && !this._checkStatement()) {
      var dir = this;
      if (this.update) {
        this._update = function(val, oldVal) {
          if (!dir._locked) {
            dir.update(val, oldVal);
          }
        };
      } else {
        this._update = noop;
      }
      var preProcess = this._preProcess ? _.bind(this._preProcess, this) : null;
      var postProcess = this._postProcess ? _.bind(this._postProcess, this) : null;
      var watcher = this._watcher = new Watcher(this.vm, this.expression, this._update, {
        filters: this.filters,
        twoWay: this.twoWay,
        deep: this.deep,
        preProcess: preProcess,
        postProcess: postProcess,
        scope: this._scope
      });
      if (this.afterBind) {
        this.afterBind();
      } else if (this.update) {
        this.update(watcher.value);
      }
    }
    this._bound = true;
  };
  Directive.prototype._setupParams = function() {
    if (!this.params) {
      return;
    }
    var params = this.params;
    this.params = Object.create(null);
    var i = params.length;
    var key,
        val,
        mappedKey;
    while (i--) {
      key = params[i];
      mappedKey = _.camelize(key);
      val = _.getBindAttr(this.el, key);
      if (val != null) {
        this._setupParamWatcher(mappedKey, val);
      } else {
        val = _.attr(this.el, key);
        if (val != null) {
          this.params[mappedKey] = val === '' ? true : val;
        }
      }
    }
  };
  Directive.prototype._setupParamWatcher = function(key, expression) {
    var self = this;
    var called = false;
    var unwatch = (this._scope || this.vm).$watch(expression, function(val, oldVal) {
      self.params[key] = val;
      if (called) {
        var cb = self.paramWatchers && self.paramWatchers[key];
        if (cb) {
          cb.call(self, val, oldVal);
        }
      } else {
        called = true;
      }
    }, {immediate: true});
    ;
    (this._paramUnwatchFns || (this._paramUnwatchFns = [])).push(unwatch);
  };
  Directive.prototype._checkStatement = function() {
    var expression = this.expression;
    if (expression && this.acceptStatement && !expParser.isSimplePath(expression)) {
      var fn = expParser.parse(expression).get;
      var scope = this._scope || this.vm;
      var handler = function() {
        fn.call(scope, scope);
      };
      if (this.filters) {
        handler = scope._applyFilters(handler, null, this.filters);
      }
      this.update(handler);
      return true;
    }
  };
  Directive.prototype.set = function(value) {
    if (this.twoWay) {
      this._withLock(function() {
        this._watcher.set(value);
      });
    } else if (process.env.NODE_ENV !== 'production') {
      _.warn('Directive.set() can only be used inside twoWay' + 'directives.');
    }
  };
  Directive.prototype._withLock = function(fn) {
    var self = this;
    self._locked = true;
    fn.call(self);
    _.nextTick(function() {
      self._locked = false;
    });
  };
  Directive.prototype.on = function(event, handler) {
    _.on(this.el, event, handler);
    ;
    (this._listeners || (this._listeners = [])).push([event, handler]);
  };
  Directive.prototype._teardown = function() {
    if (this._bound) {
      this._bound = false;
      if (this.unbind) {
        this.unbind();
      }
      if (this._watcher) {
        this._watcher.teardown();
      }
      var listeners = this._listeners;
      var i;
      if (listeners) {
        i = listeners.length;
        while (i--) {
          _.off(this.el, listeners[i][0], listeners[i][1]);
        }
      }
      var unwatchFns = this._paramUnwatchFns;
      if (unwatchFns) {
        i = unwatchFns.length;
        while (i--) {
          unwatchFns[i]();
        }
      }
      if (process.env.NODE_ENV !== 'production' && this.el) {
        this.el._vue_directives.$remove(this);
      }
      this.vm = this.el = this._watcher = this._listeners = null;
    }
  };
  module.exports = Directive;
})(require('process'));
