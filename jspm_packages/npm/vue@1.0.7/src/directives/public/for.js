/* */ 
(function(process) {
  var _ = require('../../util/index');
  var FragmentFactory = require('../../fragment/factory');
  var isObject = _.isObject;
  var uid = 0;
  module.exports = {
    priority: 2000,
    params: ['track-by', 'stagger', 'enter-stagger', 'leave-stagger'],
    bind: function() {
      var inMatch = this.expression.match(/(.*) in (.*)/);
      if (inMatch) {
        var itMatch = inMatch[1].match(/\((.*),(.*)\)/);
        if (itMatch) {
          this.iterator = itMatch[1].trim();
          this.alias = itMatch[2].trim();
        } else {
          this.alias = inMatch[1].trim();
        }
        this.expression = inMatch[2];
      }
      if (!this.alias) {
        process.env.NODE_ENV !== 'production' && _.warn('Alias is required in v-for.');
        return;
      }
      this.id = '__v-for__' + (++uid);
      var tag = this.el.tagName;
      this.isOption = (tag === 'OPTION' || tag === 'OPTGROUP') && this.el.parentNode.tagName === 'SELECT';
      this.start = _.createAnchor('v-for-start');
      this.end = _.createAnchor('v-for-end');
      _.replace(this.el, this.end);
      _.before(this.start, this.end);
      this.cache = Object.create(null);
      this.factory = new FragmentFactory(this.vm, this.el);
    },
    update: function(data) {
      this.diff(data);
      this.updateRef();
      this.updateModel();
    },
    diff: function(data) {
      var item = data[0];
      var convertedFromObject = this.fromObject = isObject(item) && item.hasOwnProperty('$key') && item.hasOwnProperty('$value');
      var trackByKey = this.params.trackBy;
      var oldFrags = this.frags;
      var frags = this.frags = new Array(data.length);
      var alias = this.alias;
      var iterator = this.iterator;
      var start = this.start;
      var end = this.end;
      var inDoc = _.inDoc(start);
      var init = !oldFrags;
      var i,
          l,
          frag,
          key,
          value,
          primitive;
      for (i = 0, l = data.length; i < l; i++) {
        item = data[i];
        key = convertedFromObject ? item.$key : null;
        value = convertedFromObject ? item.$value : item;
        primitive = !isObject(value);
        frag = !init && this.getCachedFrag(value, i, key);
        if (frag) {
          frag.reused = true;
          frag.scope.$index = i;
          if (key) {
            frag.scope.$key = key;
          }
          if (iterator) {
            frag.scope[iterator] = key !== null ? key : i;
          }
          if (trackByKey || convertedFromObject || primitive) {
            frag.scope[alias] = value;
          }
        } else {
          frag = this.create(value, alias, i, key);
          frag.fresh = !init;
        }
        frags[i] = frag;
        if (init) {
          frag.before(end);
        }
      }
      if (init) {
        return;
      }
      var removalIndex = 0;
      var totalRemoved = oldFrags.length - frags.length;
      for (i = 0, l = oldFrags.length; i < l; i++) {
        frag = oldFrags[i];
        if (!frag.reused) {
          this.deleteCachedFrag(frag);
          this.remove(frag, removalIndex++, totalRemoved, inDoc);
        }
      }
      var targetPrev,
          prevEl,
          currentPrev;
      var insertionIndex = 0;
      for (i = 0, l = frags.length; i < l; i++) {
        frag = frags[i];
        targetPrev = frags[i - 1];
        prevEl = targetPrev ? targetPrev.staggerCb ? targetPrev.staggerAnchor : targetPrev.end || targetPrev.node : start;
        if (frag.reused && !frag.staggerCb) {
          currentPrev = findPrevFrag(frag, start, this.id);
          if (currentPrev !== targetPrev) {
            this.move(frag, prevEl);
          }
        } else {
          this.insert(frag, insertionIndex++, prevEl, inDoc);
        }
        frag.reused = frag.fresh = false;
      }
    },
    create: function(value, alias, index, key) {
      var host = this._host;
      var parentScope = this._scope || this.vm;
      var scope = Object.create(parentScope);
      scope.$refs = Object.create(parentScope.$refs);
      scope.$els = Object.create(parentScope.$els);
      scope.$parent = parentScope;
      scope.$forContext = this;
      _.defineReactive(scope, alias, value);
      _.defineReactive(scope, '$index', index);
      if (key) {
        _.defineReactive(scope, '$key', key);
      } else if (scope.$key) {
        _.define(scope, '$key', null);
      }
      if (this.iterator) {
        _.defineReactive(scope, this.iterator, key !== null ? key : index);
      }
      var frag = this.factory.create(host, scope, this._frag);
      frag.forId = this.id;
      this.cacheFrag(value, frag, index, key);
      return frag;
    },
    updateRef: function() {
      var ref = this.descriptor.ref;
      if (!ref)
        return;
      var hash = (this._scope || this.vm).$refs;
      var refs;
      if (!this.fromObject) {
        refs = this.frags.map(findVmFromFrag);
      } else {
        refs = {};
        this.frags.forEach(function(frag) {
          refs[frag.scope.$key] = findVmFromFrag(frag);
        });
      }
      hash[ref] = refs;
    },
    updateModel: function() {
      if (this.isOption) {
        var parent = this.start.parentNode;
        var model = parent && parent.__v_model;
        if (model) {
          model.forceUpdate();
        }
      }
    },
    insert: function(frag, index, prevEl, inDoc) {
      if (frag.staggerCb) {
        frag.staggerCb.cancel();
        frag.staggerCb = null;
      }
      var staggerAmount = this.getStagger(frag, index, null, 'enter');
      if (inDoc && staggerAmount) {
        var anchor = frag.staggerAnchor;
        if (!anchor) {
          anchor = frag.staggerAnchor = _.createAnchor('stagger-anchor');
          anchor.__vfrag__ = frag;
        }
        _.after(anchor, prevEl);
        var op = frag.staggerCb = _.cancellable(function() {
          frag.staggerCb = null;
          frag.before(anchor);
          _.remove(anchor);
        });
        setTimeout(op, staggerAmount);
      } else {
        frag.before(prevEl.nextSibling);
      }
    },
    remove: function(frag, index, total, inDoc) {
      if (frag.staggerCb) {
        frag.staggerCb.cancel();
        frag.staggerCb = null;
        return;
      }
      var staggerAmount = this.getStagger(frag, index, total, 'leave');
      if (inDoc && staggerAmount) {
        var op = frag.staggerCb = _.cancellable(function() {
          frag.staggerCb = null;
          frag.remove();
        });
        setTimeout(op, staggerAmount);
      } else {
        frag.remove();
      }
    },
    move: function(frag, prevEl) {
      frag.before(prevEl.nextSibling, false);
    },
    cacheFrag: function(value, frag, index, key) {
      var trackByKey = this.params.trackBy;
      var cache = this.cache;
      var primitive = !isObject(value);
      var id;
      if (key || trackByKey || primitive) {
        id = trackByKey ? trackByKey === '$index' ? index : value[trackByKey] : (key || value);
        if (!cache[id]) {
          cache[id] = frag;
        } else if (trackByKey !== '$index') {
          process.env.NODE_ENV !== 'production' && this.warnDuplicate(value);
        }
      } else {
        id = this.id;
        if (value.hasOwnProperty(id)) {
          if (value[id] === null) {
            value[id] = frag;
          } else {
            process.env.NODE_ENV !== 'production' && this.warnDuplicate(value);
          }
        } else {
          _.define(value, id, frag);
        }
      }
      frag.raw = value;
    },
    getCachedFrag: function(value, index, key) {
      var trackByKey = this.params.trackBy;
      var primitive = !isObject(value);
      var frag;
      if (key || trackByKey || primitive) {
        var id = trackByKey ? trackByKey === '$index' ? index : value[trackByKey] : (key || value);
        frag = this.cache[id];
      } else {
        frag = value[this.id];
      }
      if (frag && (frag.reused || frag.fresh)) {
        process.env.NODE_ENV !== 'production' && this.warnDuplicate(value);
      }
      return frag;
    },
    deleteCachedFrag: function(frag) {
      var value = frag.raw;
      var trackByKey = this.params.trackBy;
      var scope = frag.scope;
      var index = scope.$index;
      var key = scope.hasOwnProperty('$key') && scope.$key;
      var primitive = !isObject(value);
      if (trackByKey || key || primitive) {
        var id = trackByKey ? trackByKey === '$index' ? index : value[trackByKey] : (key || value);
        this.cache[id] = null;
      } else {
        value[this.id] = null;
        frag.raw = null;
      }
    },
    getStagger: function(frag, index, total, type) {
      type = type + 'Stagger';
      var trans = frag.node.__v_trans;
      var hooks = trans && trans.hooks;
      var hook = hooks && (hooks[type] || hooks.stagger);
      return hook ? hook.call(frag, index, total) : index * parseInt(this.params[type] || this.params.stagger, 10);
    },
    _preProcess: function(value) {
      this.rawValue = value;
      return value;
    },
    _postProcess: function(value) {
      if (_.isArray(value)) {
        return value;
      } else if (_.isPlainObject(value)) {
        var keys = Object.keys(value);
        var i = keys.length;
        var res = new Array(i);
        var key;
        while (i--) {
          key = keys[i];
          res[i] = {
            $key: key,
            $value: value[key]
          };
        }
        return res;
      } else {
        if (typeof value === 'number') {
          value = range(value);
        }
        return value || [];
      }
    },
    unbind: function() {
      if (this.descriptor.ref) {
        (this._scope || this.vm).$refs[this.descriptor.ref] = null;
      }
      if (this.frags) {
        var i = this.frags.length;
        var frag;
        while (i--) {
          frag = this.frags[i];
          this.deleteCachedFrag(frag);
          frag.destroy();
        }
      }
    }
  };
  function findPrevFrag(frag, anchor, id) {
    var el = frag.node.previousSibling;
    if (!el)
      return;
    frag = el.__vfrag__;
    while ((!frag || frag.forId !== id || !frag.inserted) && el !== anchor) {
      el = el.previousSibling;
      if (!el)
        return;
      frag = el.__vfrag__;
    }
    return frag;
  }
  function findVmFromFrag(frag) {
    return frag.node.__vue__ || frag.node.nextSibling.__vue__;
  }
  function range(n) {
    var i = -1;
    var ret = new Array(n);
    while (++i < n) {
      ret[i] = i;
    }
    return ret;
  }
  if (process.env.NODE_ENV !== 'production') {
    module.exports.warnDuplicate = function(value) {
      _.warn('Duplicate value found in v-for="' + this.descriptor.raw + '": ' + JSON.stringify(value) + '. Use track-by="$index" if ' + 'you are expecting duplicate values.');
    };
  }
})(require('process'));
