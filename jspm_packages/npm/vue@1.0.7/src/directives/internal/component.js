/* */ 
(function(process) {
  var _ = require('../../util/index');
  var templateParser = require('../../parsers/template');
  module.exports = {
    priority: 1500,
    params: ['keep-alive', 'transition-mode', 'inline-template'],
    bind: function() {
      if (!this.el.__vue__) {
        this.keepAlive = this.params.keepAlive;
        if (this.keepAlive) {
          this.cache = {};
        }
        if (this.params.inlineTemplate) {
          this.inlineTemplate = _.extractContent(this.el, true);
        }
        this.pendingComponentCb = this.Component = null;
        this.pendingRemovals = 0;
        this.pendingRemovalCb = null;
        this.anchor = _.createAnchor('v-component');
        _.replace(this.el, this.anchor);
        this.el.removeAttribute('is');
        if (this.literal) {
          this.setComponent(this.expression);
        }
      } else {
        process.env.NODE_ENV !== 'production' && _.warn('cannot mount component "' + this.expression + '" ' + 'on already mounted element: ' + this.el);
      }
    },
    update: function(value) {
      if (!this.literal) {
        this.setComponent(value);
      }
    },
    setComponent: function(value, cb) {
      this.invalidatePending();
      if (!value) {
        this.unbuild(true);
        this.remove(this.childVM, cb);
        this.childVM = null;
      } else {
        var self = this;
        this.resolveComponent(value, function() {
          self.mountComponent(cb);
        });
      }
    },
    resolveComponent: function(id, cb) {
      var self = this;
      this.pendingComponentCb = _.cancellable(function(Component) {
        self.ComponentName = Component.options.name || id;
        self.Component = Component;
        cb();
      });
      this.vm._resolveComponent(id, this.pendingComponentCb);
    },
    mountComponent: function(cb) {
      this.unbuild(true);
      var self = this;
      var activateHook = this.Component.options.activate;
      var cached = this.getCached();
      var newComponent = this.build();
      if (activateHook && !cached) {
        this.waitingFor = newComponent;
        activateHook.call(newComponent, function() {
          self.waitingFor = null;
          self.transition(newComponent, cb);
        });
      } else {
        if (cached) {
          newComponent._updateRef();
        }
        this.transition(newComponent, cb);
      }
    },
    invalidatePending: function() {
      if (this.pendingComponentCb) {
        this.pendingComponentCb.cancel();
        this.pendingComponentCb = null;
      }
    },
    build: function(extraOptions) {
      var cached = this.getCached();
      if (cached) {
        return cached;
      }
      if (this.Component) {
        var options = {
          name: this.ComponentName,
          el: templateParser.clone(this.el),
          template: this.inlineTemplate,
          parent: this._host || this.vm,
          _linkerCachable: !this.inlineTemplate,
          _ref: this.descriptor.ref,
          _asComponent: true,
          _isRouterView: this._isRouterView,
          _context: this.vm,
          _scope: this._scope,
          _frag: this._frag
        };
        if (extraOptions) {
          _.extend(options, extraOptions);
        }
        var child = new this.Component(options);
        if (this.keepAlive) {
          this.cache[this.Component.cid] = child;
        }
        if (process.env.NODE_ENV !== 'production' && this.el.hasAttribute('transition') && child._isFragment) {
          _.warn('Transitions will not work on a fragment instance. ' + 'Template: ' + child.$options.template);
        }
        return child;
      }
    },
    getCached: function() {
      return this.keepAlive && this.cache[this.Component.cid];
    },
    unbuild: function(defer) {
      if (this.waitingFor) {
        this.waitingFor.$destroy();
        this.waitingFor = null;
      }
      var child = this.childVM;
      if (!child || this.keepAlive) {
        if (child) {
          child._updateRef(true);
        }
        return;
      }
      child.$destroy(false, defer);
    },
    remove: function(child, cb) {
      var keepAlive = this.keepAlive;
      if (child) {
        this.pendingRemovals++;
        this.pendingRemovalCb = cb;
        var self = this;
        child.$remove(function() {
          self.pendingRemovals--;
          if (!keepAlive)
            child._cleanup();
          if (!self.pendingRemovals && self.pendingRemovalCb) {
            self.pendingRemovalCb();
            self.pendingRemovalCb = null;
          }
        });
      } else if (cb) {
        cb();
      }
    },
    transition: function(target, cb) {
      var self = this;
      var current = this.childVM;
      if (process.env.NODE_ENV !== 'production') {
        if (current)
          current._inactive = true;
        target._inactive = false;
      }
      this.childVM = target;
      switch (self.params.transitionMode) {
        case 'in-out':
          target.$before(self.anchor, function() {
            self.remove(current, cb);
          });
          break;
        case 'out-in':
          self.remove(current, function() {
            target.$before(self.anchor, cb);
          });
          break;
        default:
          self.remove(current);
          target.$before(self.anchor, cb);
      }
    },
    unbind: function() {
      this.invalidatePending();
      this.unbuild();
      if (this.cache) {
        for (var key in this.cache) {
          this.cache[key].$destroy();
        }
        this.cache = null;
      }
    }
  };
})(require('process'));
