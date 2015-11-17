/* */ 
var _ = require('../util/index');
var Directive = require('../directive');
var compiler = require('../compiler/index');
exports._updateRef = function(remove) {
  var ref = this.$options._ref;
  if (ref) {
    var refs = (this._scope || this._context).$refs;
    if (remove) {
      if (refs[ref] === this) {
        refs[ref] = null;
      }
    } else {
      refs[ref] = this;
    }
  }
};
exports._compile = function(el) {
  var options = this.$options;
  var original = el;
  el = compiler.transclude(el, options);
  this._initElement(el);
  var contextOptions = this._context && this._context.$options;
  var rootLinker = compiler.compileRoot(el, options, contextOptions);
  var contentLinkFn;
  var ctor = this.constructor;
  if (options._linkerCachable) {
    contentLinkFn = ctor.linker;
    if (!contentLinkFn) {
      contentLinkFn = ctor.linker = compiler.compile(el, options);
    }
  }
  var rootUnlinkFn = rootLinker(this, el, this._scope);
  var contentUnlinkFn = contentLinkFn ? contentLinkFn(this, el) : compiler.compile(el, options)(this, el);
  this._unlinkFn = function() {
    rootUnlinkFn();
    contentUnlinkFn(true);
  };
  if (options.replace) {
    _.replace(original, el);
  }
  this._isCompiled = true;
  this._callHook('compiled');
  return el;
};
exports._initElement = function(el) {
  if (el instanceof DocumentFragment) {
    this._isFragment = true;
    this.$el = this._fragmentStart = el.firstChild;
    this._fragmentEnd = el.lastChild;
    if (this._fragmentStart.nodeType === 3) {
      this._fragmentStart.data = this._fragmentEnd.data = '';
    }
    this._fragment = el;
  } else {
    this.$el = el;
  }
  this.$el.__vue__ = this;
  this._callHook('beforeCompile');
};
exports._bindDir = function(descriptor, node, host, scope, frag) {
  this._directives.push(new Directive(descriptor, this, node, host, scope, frag));
};
exports._destroy = function(remove, deferCleanup) {
  if (this._isBeingDestroyed) {
    if (!deferCleanup) {
      this._cleanup();
    }
    return;
  }
  this._callHook('beforeDestroy');
  this._isBeingDestroyed = true;
  var i;
  var parent = this.$parent;
  if (parent && !parent._isBeingDestroyed) {
    parent.$children.$remove(this);
    this._updateRef(true);
  }
  i = this.$children.length;
  while (i--) {
    this.$children[i].$destroy();
  }
  if (this._propsUnlinkFn) {
    this._propsUnlinkFn();
  }
  if (this._unlinkFn) {
    this._unlinkFn();
  }
  i = this._watchers.length;
  while (i--) {
    this._watchers[i].teardown();
  }
  if (this.$el) {
    this.$el.__vue__ = null;
  }
  var self = this;
  if (remove && this.$el) {
    this.$remove(function() {
      self._cleanup();
    });
  } else if (!deferCleanup) {
    this._cleanup();
  }
};
exports._cleanup = function() {
  if (this._isDestroyed) {
    return;
  }
  if (this._frag) {
    this._frag.children.$remove(this);
  }
  if (this._data.__ob__) {
    this._data.__ob__.removeVm(this);
  }
  this.$el = this.$parent = this.$root = this.$children = this._watchers = this._context = this._scope = this._directives = null;
  this._isDestroyed = true;
  this._callHook('destroyed');
  this.$off();
};
