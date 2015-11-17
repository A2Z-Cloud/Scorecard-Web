/* */ 
(function(process) {
  var _ = require('../util/index');
  var compiler = require('../compiler/index');
  exports.$mount = function(el) {
    if (this._isCompiled) {
      process.env.NODE_ENV !== 'production' && _.warn('$mount() should be called only once.');
      return;
    }
    el = _.query(el);
    if (!el) {
      el = document.createElement('div');
    }
    this._compile(el);
    this._initDOMHooks();
    if (_.inDoc(this.$el)) {
      this._callHook('attached');
      ready.call(this);
    } else {
      this.$once('hook:attached', ready);
    }
    return this;
  };
  function ready() {
    this._isAttached = true;
    this._isReady = true;
    this._callHook('ready');
  }
  exports.$destroy = function(remove, deferCleanup) {
    this._destroy(remove, deferCleanup);
  };
  exports.$compile = function(el, host, scope, frag) {
    return compiler.compile(el, this.$options, true)(this, el, host, scope, frag);
  };
})(require('process'));
