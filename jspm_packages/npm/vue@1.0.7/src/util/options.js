/* */ 
(function(process) {
  var _ = require('./index');
  var config = require('../config');
  var extend = _.extend;
  var strats = config.optionMergeStrategies = Object.create(null);
  function mergeData(to, from) {
    var key,
        toVal,
        fromVal;
    for (key in from) {
      toVal = to[key];
      fromVal = from[key];
      if (!to.hasOwnProperty(key)) {
        _.set(to, key, fromVal);
      } else if (_.isObject(toVal) && _.isObject(fromVal)) {
        mergeData(toVal, fromVal);
      }
    }
    return to;
  }
  strats.data = function(parentVal, childVal, vm) {
    if (!vm) {
      if (!childVal) {
        return parentVal;
      }
      if (typeof childVal !== 'function') {
        process.env.NODE_ENV !== 'production' && _.warn('The "data" option should be a function ' + 'that returns a per-instance value in component ' + 'definitions.');
        return parentVal;
      }
      if (!parentVal) {
        return childVal;
      }
      return function mergedDataFn() {
        return mergeData(childVal.call(this), parentVal.call(this));
      };
    } else if (parentVal || childVal) {
      return function mergedInstanceDataFn() {
        var instanceData = typeof childVal === 'function' ? childVal.call(vm) : childVal;
        var defaultData = typeof parentVal === 'function' ? parentVal.call(vm) : undefined;
        if (instanceData) {
          return mergeData(instanceData, defaultData);
        } else {
          return defaultData;
        }
      };
    }
  };
  strats.el = function(parentVal, childVal, vm) {
    if (!vm && childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && _.warn('The "el" option should be a function ' + 'that returns a per-instance value in component ' + 'definitions.');
      return;
    }
    var ret = childVal || parentVal;
    return vm && typeof ret === 'function' ? ret.call(vm) : ret;
  };
  strats.init = strats.created = strats.ready = strats.attached = strats.detached = strats.beforeCompile = strats.compiled = strats.beforeDestroy = strats.destroyed = function(parentVal, childVal) {
    return childVal ? parentVal ? parentVal.concat(childVal) : _.isArray(childVal) ? childVal : [childVal] : parentVal;
  };
  strats.paramAttributes = function() {
    process.env.NODE_ENV !== 'production' && _.warn('"paramAttributes" option has been deprecated in 0.12. ' + 'Use "props" instead.');
  };
  function mergeAssets(parentVal, childVal) {
    var res = Object.create(parentVal);
    return childVal ? extend(res, guardArrayAssets(childVal)) : res;
  }
  config._assetTypes.forEach(function(type) {
    strats[type + 's'] = mergeAssets;
  });
  strats.watch = strats.events = function(parentVal, childVal) {
    if (!childVal)
      return parentVal;
    if (!parentVal)
      return childVal;
    var ret = {};
    extend(ret, parentVal);
    for (var key in childVal) {
      var parent = ret[key];
      var child = childVal[key];
      if (parent && !_.isArray(parent)) {
        parent = [parent];
      }
      ret[key] = parent ? parent.concat(child) : [child];
    }
    return ret;
  };
  strats.props = strats.methods = strats.computed = function(parentVal, childVal) {
    if (!childVal)
      return parentVal;
    if (!parentVal)
      return childVal;
    var ret = Object.create(null);
    extend(ret, parentVal);
    extend(ret, childVal);
    return ret;
  };
  var defaultStrat = function(parentVal, childVal) {
    return childVal === undefined ? parentVal : childVal;
  };
  function guardComponents(options) {
    if (options.components) {
      var components = options.components = guardArrayAssets(options.components);
      var def;
      var ids = Object.keys(components);
      for (var i = 0,
          l = ids.length; i < l; i++) {
        var key = ids[i];
        if (_.commonTagRE.test(key)) {
          process.env.NODE_ENV !== 'production' && _.warn('Do not use built-in HTML elements as component ' + 'id: ' + key);
          continue;
        }
        def = components[key];
        if (_.isPlainObject(def)) {
          components[key] = _.Vue.extend(def);
        }
      }
    }
  }
  function guardProps(options) {
    var props = options.props;
    var i;
    if (_.isArray(props)) {
      options.props = {};
      i = props.length;
      while (i--) {
        options.props[props[i]] = null;
      }
    } else if (_.isPlainObject(props)) {
      var keys = Object.keys(props);
      i = keys.length;
      while (i--) {
        var val = props[keys[i]];
        if (typeof val === 'function') {
          props[keys[i]] = {type: val};
        }
      }
    }
  }
  function guardArrayAssets(assets) {
    if (_.isArray(assets)) {
      var res = {};
      var i = assets.length;
      var asset;
      while (i--) {
        asset = assets[i];
        var id = typeof asset === 'function' ? ((asset.options && asset.options.name) || asset.id) : (asset.name || asset.id);
        if (!id) {
          process.env.NODE_ENV !== 'production' && _.warn('Array-syntax assets must provide a "name" or "id" field.');
        } else {
          res[id] = asset;
        }
      }
      return res;
    }
    return assets;
  }
  exports.mergeOptions = function merge(parent, child, vm) {
    guardComponents(child);
    guardProps(child);
    var options = {};
    var key;
    if (child.mixins) {
      for (var i = 0,
          l = child.mixins.length; i < l; i++) {
        parent = merge(parent, child.mixins[i], vm);
      }
    }
    for (key in parent) {
      mergeField(key);
    }
    for (key in child) {
      if (!(parent.hasOwnProperty(key))) {
        mergeField(key);
      }
    }
    function mergeField(key) {
      var strat = strats[key] || defaultStrat;
      options[key] = strat(parent[key], child[key], vm, key);
    }
    return options;
  };
  exports.resolveAsset = function resolve(options, type, id) {
    var assets = options[type];
    var camelizedId;
    return assets[id] || assets[camelizedId = _.camelize(id)] || assets[camelizedId.charAt(0).toUpperCase() + camelizedId.slice(1)];
  };
})(require('process'));
