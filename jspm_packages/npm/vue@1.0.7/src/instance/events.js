/* */ 
(function(process) {
  var _ = require('../util/index');
  var inDoc = _.inDoc;
  var eventRE = /^v-on:|^@/;
  exports._initEvents = function() {
    var options = this.$options;
    if (options._asComponent) {
      registerComponentEvents(this, options.el);
    }
    registerCallbacks(this, '$on', options.events);
    registerCallbacks(this, '$watch', options.watch);
  };
  function registerComponentEvents(vm, el) {
    var attrs = el.attributes;
    var name,
        handler;
    for (var i = 0,
        l = attrs.length; i < l; i++) {
      name = attrs[i].name;
      if (eventRE.test(name)) {
        name = name.replace(eventRE, '');
        handler = (vm._scope || vm._context).$eval(attrs[i].value, true);
        vm.$on(name.replace(eventRE), handler);
      }
    }
  }
  function registerCallbacks(vm, action, hash) {
    if (!hash)
      return;
    var handlers,
        key,
        i,
        j;
    for (key in hash) {
      handlers = hash[key];
      if (_.isArray(handlers)) {
        for (i = 0, j = handlers.length; i < j; i++) {
          register(vm, action, key, handlers[i]);
        }
      } else {
        register(vm, action, key, handlers);
      }
    }
  }
  function register(vm, action, key, handler, options) {
    var type = typeof handler;
    if (type === 'function') {
      vm[action](key, handler, options);
    } else if (type === 'string') {
      var methods = vm.$options.methods;
      var method = methods && methods[handler];
      if (method) {
        vm[action](key, method, options);
      } else {
        process.env.NODE_ENV !== 'production' && _.warn('Unknown method: "' + handler + '" when ' + 'registering callback for ' + action + ': "' + key + '".');
      }
    } else if (handler && type === 'object') {
      register(vm, action, key, handler.handler, handler);
    }
  }
  exports._initDOMHooks = function() {
    this.$on('hook:attached', onAttached);
    this.$on('hook:detached', onDetached);
  };
  function onAttached() {
    if (!this._isAttached) {
      this._isAttached = true;
      this.$children.forEach(callAttach);
    }
  }
  function callAttach(child) {
    if (!child._isAttached && inDoc(child.$el)) {
      child._callHook('attached');
    }
  }
  function onDetached() {
    if (this._isAttached) {
      this._isAttached = false;
      this.$children.forEach(callDetach);
    }
  }
  function callDetach(child) {
    if (child._isAttached && !inDoc(child.$el)) {
      child._callHook('detached');
    }
  }
  exports._callHook = function(hook) {
    var handlers = this.$options[hook];
    if (handlers) {
      for (var i = 0,
          j = handlers.length; i < j; i++) {
        handlers[i].call(this);
      }
    }
    this.$emit('hook:' + hook);
  };
})(require('process'));
