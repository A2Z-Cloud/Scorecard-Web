/* */ 
var _ = require('../util/index');
var Dep = require('./dep');
var arrayMethods = require('./array');
var arrayKeys = Object.getOwnPropertyNames(arrayMethods);
function Observer(value) {
  this.value = value;
  this.dep = new Dep();
  _.define(value, '__ob__', this);
  if (_.isArray(value)) {
    var augment = _.hasProto ? protoAugment : copyAugment;
    augment(value, arrayMethods, arrayKeys);
    this.observeArray(value);
  } else {
    this.walk(value);
  }
}
Observer.create = function(value, vm) {
  if (!value || typeof value !== 'object') {
    return;
  }
  var ob;
  if (value.hasOwnProperty('__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if ((_.isArray(value) || _.isPlainObject(value)) && !Object.isFrozen(value) && !value._isVue) {
    ob = new Observer(value);
  }
  if (ob && vm) {
    ob.addVm(vm);
  }
  return ob;
};
Observer.prototype.walk = function(obj) {
  var keys = Object.keys(obj);
  var i = keys.length;
  while (i--) {
    this.convert(keys[i], obj[keys[i]]);
  }
};
Observer.prototype.observeArray = function(items) {
  var i = items.length;
  while (i--) {
    Observer.create(items[i]);
  }
};
Observer.prototype.convert = function(key, val) {
  defineReactive(this.value, key, val);
};
Observer.prototype.addVm = function(vm) {
  (this.vms || (this.vms = [])).push(vm);
};
Observer.prototype.removeVm = function(vm) {
  this.vms.$remove(vm);
};
function protoAugment(target, src) {
  target.__proto__ = src;
}
function copyAugment(target, src, keys) {
  var i = keys.length;
  var key;
  while (i--) {
    key = keys[i];
    _.define(target, key, src[key]);
  }
}
function defineReactive(obj, key, val) {
  var dep = new Dep();
  var childOb = Observer.create(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function metaGetter() {
      if (Dep.target) {
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
        }
        if (_.isArray(val)) {
          for (var e,
              i = 0,
              l = val.length; i < l; i++) {
            e = val[i];
            e && e.__ob__ && e.__ob__.dep.depend();
          }
        }
      }
      return val;
    },
    set: function metaSetter(newVal) {
      if (newVal === val)
        return;
      val = newVal;
      childOb = Observer.create(newVal);
      dep.notify();
    }
  });
}
_.defineReactive = defineReactive;
module.exports = Observer;
