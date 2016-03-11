/* */ 
var mergeOptions = require('../util/index').mergeOptions;
var uid = 0;
exports._init = function(options) {
  options = options || {};
  this.$el = null;
  this.$parent = options.parent;
  this.$root = this.$parent ? this.$parent.$root : this;
  this.$children = [];
  this.$refs = {};
  this.$els = {};
  this._watchers = [];
  this._directives = [];
  this._uid = uid++;
  this._isVue = true;
  this._events = {};
  this._eventsCount = {};
  this._shouldPropagate = false;
  this._isFragment = false;
  this._fragment = this._fragmentStart = this._fragmentEnd = null;
  this._isCompiled = this._isDestroyed = this._isReady = this._isAttached = this._isBeingDestroyed = false;
  this._unlinkFn = null;
  this._context = options._context || this.$parent;
  this._scope = options._scope;
  this._frag = options._frag;
  if (this._frag) {
    this._frag.children.push(this);
  }
  if (this.$parent) {
    this.$parent.$children.push(this);
  }
  options = this.$options = mergeOptions(this.constructor.options, options, this);
  this._updateRef();
  this._data = {};
  this._callHook('init');
  this._initState();
  this._initEvents();
  this._callHook('created');
  if (options.el) {
    this.$mount(options.el);
  }
};
