/* */ 
(function(process) {
  var _ = require('../util/index');
  var dirParser = require('../parsers/directive');
  var propDef = require('../directives/internal/prop');
  var propBindingModes = require('../config')._propBindingModes;
  var empty = {};
  var identRE = require('../parsers/path').identRE;
  var settablePathRE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\[[^\[\]]+\])*$/;
  module.exports = function compileProps(el, propOptions) {
    var props = [];
    var names = Object.keys(propOptions);
    var i = names.length;
    var options,
        name,
        attr,
        value,
        path,
        parsed,
        prop;
    while (i--) {
      name = names[i];
      options = propOptions[name] || empty;
      if (process.env.NODE_ENV !== 'production' && name === '$data') {
        _.warn('Do not use $data as prop.');
        continue;
      }
      path = _.camelize(name);
      if (!identRE.test(path)) {
        process.env.NODE_ENV !== 'production' && _.warn('Invalid prop key: "' + name + '". Prop keys ' + 'must be valid identifiers.');
        continue;
      }
      prop = {
        name: name,
        path: path,
        options: options,
        mode: propBindingModes.ONE_WAY,
        raw: null
      };
      attr = _.hyphenate(name);
      if ((value = _.getBindAttr(el, attr)) === null) {
        if ((value = _.getBindAttr(el, attr + '.sync')) !== null) {
          prop.mode = propBindingModes.TWO_WAY;
        } else if ((value = _.getBindAttr(el, attr + '.once')) !== null) {
          prop.mode = propBindingModes.ONE_TIME;
        }
      }
      if (value !== null) {
        prop.raw = value;
        parsed = dirParser.parse(value);
        value = parsed.expression;
        prop.filters = parsed.filters;
        if (_.isLiteral(value)) {
          prop.optimizedLiteral = true;
        } else {
          prop.dynamic = true;
          if (process.env.NODE_ENV !== 'production' && prop.mode === propBindingModes.TWO_WAY && !settablePathRE.test(value)) {
            prop.mode = propBindingModes.ONE_WAY;
            _.warn('Cannot bind two-way prop with non-settable ' + 'parent path: ' + value);
          }
        }
        prop.parentPath = value;
        if (process.env.NODE_ENV !== 'production' && options.twoWay && prop.mode !== propBindingModes.TWO_WAY) {
          _.warn('Prop "' + name + '" expects a two-way binding type.');
        }
      } else if ((value = _.attr(el, attr)) !== null) {
        prop.raw = value;
      } else if (options.required) {
        process.env.NODE_ENV !== 'production' && _.warn('Missing required prop: ' + name);
      }
      props.push(prop);
    }
    return makePropsLinkFn(props);
  };
  function makePropsLinkFn(props) {
    return function propsLinkFn(vm, scope) {
      vm._props = {};
      var i = props.length;
      var prop,
          path,
          options,
          value,
          raw;
      while (i--) {
        prop = props[i];
        raw = prop.raw;
        path = prop.path;
        options = prop.options;
        vm._props[path] = prop;
        if (raw === null) {
          _.initProp(vm, prop, getDefault(vm, options));
        } else if (prop.dynamic) {
          if (vm._context) {
            if (prop.mode === propBindingModes.ONE_TIME) {
              value = (scope || vm._context).$get(prop.parentPath);
              _.initProp(vm, prop, value);
            } else {
              vm._bindDir({
                name: 'prop',
                def: propDef,
                prop: prop
              }, null, null, scope);
            }
          } else {
            process.env.NODE_ENV !== 'production' && _.warn('Cannot bind dynamic prop on a root instance' + ' with no parent: ' + prop.name + '="' + raw + '"');
          }
        } else if (prop.optimizedLiteral) {
          var stripped = _.stripQuotes(raw);
          value = stripped === raw ? _.toBoolean(_.toNumber(raw)) : stripped;
          _.initProp(vm, prop, value);
        } else {
          value = options.type === Boolean && raw === '' ? true : raw;
          _.initProp(vm, prop, value);
        }
      }
    };
  }
  function getDefault(vm, options) {
    if (!options.hasOwnProperty('default')) {
      return options.type === Boolean ? false : undefined;
    }
    var def = options.default;
    if (_.isObject(def)) {
      process.env.NODE_ENV !== 'production' && _.warn('Object/Array as default prop values will be shared ' + 'across multiple instances. Use a factory function ' + 'to return the default value instead.');
    }
    return typeof def === 'function' && options.type !== Function ? def.call(vm) : def;
  }
})(require('process'));
