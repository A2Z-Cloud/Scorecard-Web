/* */ 
var _ = require('../util/index');
var queue = require('./queue');
var addClass = _.addClass;
var removeClass = _.removeClass;
var transitionEndEvent = _.transitionEndEvent;
var animationEndEvent = _.animationEndEvent;
var transDurationProp = _.transitionProp + 'Duration';
var animDurationProp = _.animationProp + 'Duration';
var TYPE_TRANSITION = 1;
var TYPE_ANIMATION = 2;
function Transition(el, id, hooks, vm) {
  this.id = id;
  this.el = el;
  this.enterClass = id + '-enter';
  this.leaveClass = id + '-leave';
  this.hooks = hooks;
  this.vm = vm;
  this.pendingCssEvent = this.pendingCssCb = this.cancel = this.pendingJsCb = this.op = this.cb = null;
  this.justEntered = false;
  this.entered = this.left = false;
  this.typeCache = {};
  var self = this;
  ;
  ['enterNextTick', 'enterDone', 'leaveNextTick', 'leaveDone'].forEach(function(m) {
    self[m] = _.bind(self[m], self);
  });
}
var p = Transition.prototype;
p.enter = function(op, cb) {
  this.cancelPending();
  this.callHook('beforeEnter');
  this.cb = cb;
  addClass(this.el, this.enterClass);
  op();
  this.entered = false;
  this.callHookWithCb('enter');
  if (this.entered) {
    return;
  }
  this.cancel = this.hooks && this.hooks.enterCancelled;
  queue.push(this.enterNextTick);
};
p.enterNextTick = function() {
  this.justEntered = true;
  var self = this;
  setTimeout(function() {
    self.justEntered = false;
  }, 17);
  var enterDone = this.enterDone;
  var type = this.getCssTransitionType(this.enterClass);
  if (!this.pendingJsCb) {
    if (type === TYPE_TRANSITION) {
      removeClass(this.el, this.enterClass);
      this.setupCssCb(transitionEndEvent, enterDone);
    } else if (type === TYPE_ANIMATION) {
      this.setupCssCb(animationEndEvent, enterDone);
    } else {
      enterDone();
    }
  } else if (type === TYPE_TRANSITION) {
    removeClass(this.el, this.enterClass);
  }
};
p.enterDone = function() {
  this.entered = true;
  this.cancel = this.pendingJsCb = null;
  removeClass(this.el, this.enterClass);
  this.callHook('afterEnter');
  if (this.cb)
    this.cb();
};
p.leave = function(op, cb) {
  this.cancelPending();
  this.callHook('beforeLeave');
  this.op = op;
  this.cb = cb;
  addClass(this.el, this.leaveClass);
  this.left = false;
  this.callHookWithCb('leave');
  if (this.left) {
    return;
  }
  this.cancel = this.hooks && this.hooks.leaveCancelled;
  if (this.op && !this.pendingJsCb) {
    if (this.justEntered) {
      this.leaveDone();
    } else {
      queue.push(this.leaveNextTick);
    }
  }
};
p.leaveNextTick = function() {
  var type = this.getCssTransitionType(this.leaveClass);
  if (type) {
    var event = type === TYPE_TRANSITION ? transitionEndEvent : animationEndEvent;
    this.setupCssCb(event, this.leaveDone);
  } else {
    this.leaveDone();
  }
};
p.leaveDone = function() {
  this.left = true;
  this.cancel = this.pendingJsCb = null;
  this.op();
  removeClass(this.el, this.leaveClass);
  this.callHook('afterLeave');
  if (this.cb)
    this.cb();
  this.op = null;
};
p.cancelPending = function() {
  this.op = this.cb = null;
  var hasPending = false;
  if (this.pendingCssCb) {
    hasPending = true;
    _.off(this.el, this.pendingCssEvent, this.pendingCssCb);
    this.pendingCssEvent = this.pendingCssCb = null;
  }
  if (this.pendingJsCb) {
    hasPending = true;
    this.pendingJsCb.cancel();
    this.pendingJsCb = null;
  }
  if (hasPending) {
    removeClass(this.el, this.enterClass);
    removeClass(this.el, this.leaveClass);
  }
  if (this.cancel) {
    this.cancel.call(this.vm, this.el);
    this.cancel = null;
  }
};
p.callHook = function(type) {
  if (this.hooks && this.hooks[type]) {
    this.hooks[type].call(this.vm, this.el);
  }
};
p.callHookWithCb = function(type) {
  var hook = this.hooks && this.hooks[type];
  if (hook) {
    if (hook.length > 1) {
      this.pendingJsCb = _.cancellable(this[type + 'Done']);
    }
    hook.call(this.vm, this.el, this.pendingJsCb);
  }
};
p.getCssTransitionType = function(className) {
  if (!transitionEndEvent || document.hidden || (this.hooks && this.hooks.css === false) || isHidden(this.el)) {
    return;
  }
  var type = this.typeCache[className];
  if (type)
    return type;
  var inlineStyles = this.el.style;
  var computedStyles = window.getComputedStyle(this.el);
  var transDuration = inlineStyles[transDurationProp] || computedStyles[transDurationProp];
  if (transDuration && transDuration !== '0s') {
    type = TYPE_TRANSITION;
  } else {
    var animDuration = inlineStyles[animDurationProp] || computedStyles[animDurationProp];
    if (animDuration && animDuration !== '0s') {
      type = TYPE_ANIMATION;
    }
  }
  if (type) {
    this.typeCache[className] = type;
  }
  return type;
};
p.setupCssCb = function(event, cb) {
  this.pendingCssEvent = event;
  var self = this;
  var el = this.el;
  var onEnd = this.pendingCssCb = function(e) {
    if (e.target === el) {
      _.off(el, event, onEnd);
      self.pendingCssEvent = self.pendingCssCb = null;
      if (!self.pendingJsCb && cb) {
        cb();
      }
    }
  };
  _.on(el, event, onEnd);
};
function isHidden(el) {
  return !(el.offsetWidth && el.offsetHeight && el.getClientRects().length);
}
module.exports = Transition;
