/* */ 
(function(process) {
  var _ = require('../util/index');
  var publicDirectives = require('../directives/public/index');
  var internalDirectives = require('../directives/internal/index');
  var compileProps = require('./compile-props');
  var textParser = require('../parsers/text');
  var dirParser = require('../parsers/directive');
  var templateParser = require('../parsers/template');
  var resolveAsset = _.resolveAsset;
  var bindRE = /^v-bind:|^:/;
  var onRE = /^v-on:|^@/;
  var argRE = /:(.*)$/;
  var modifierRE = /\.[^\.]+/g;
  var transitionRE = /^(v-bind:|:)?transition$/;
  var terminalDirectives = ['for', 'if'];
  var DEFAULT_PRIORITY = 1000;
  exports.compile = function(el, options, partial) {
    var nodeLinkFn = partial || !options._asComponent ? compileNode(el, options) : null;
    var childLinkFn = !(nodeLinkFn && nodeLinkFn.terminal) && el.tagName !== 'SCRIPT' && el.hasChildNodes() ? compileNodeList(el.childNodes, options) : null;
    return function compositeLinkFn(vm, el, host, scope, frag) {
      var childNodes = _.toArray(el.childNodes);
      var dirs = linkAndCapture(function compositeLinkCapturer() {
        if (nodeLinkFn)
          nodeLinkFn(vm, el, host, scope, frag);
        if (childLinkFn)
          childLinkFn(vm, childNodes, host, scope, frag);
      }, vm);
      return makeUnlinkFn(vm, dirs);
    };
  };
  function linkAndCapture(linker, vm) {
    var originalDirCount = vm._directives.length;
    linker();
    var dirs = vm._directives.slice(originalDirCount);
    dirs.sort(directiveComparator);
    for (var i = 0,
        l = dirs.length; i < l; i++) {
      dirs[i]._bind();
    }
    return dirs;
  }
  function directiveComparator(a, b) {
    a = a.descriptor.def.priority || DEFAULT_PRIORITY;
    b = b.descriptor.def.priority || DEFAULT_PRIORITY;
    return a > b ? -1 : a === b ? 0 : 1;
  }
  function makeUnlinkFn(vm, dirs, context, contextDirs) {
    return function unlink(destroying) {
      teardownDirs(vm, dirs, destroying);
      if (context && contextDirs) {
        teardownDirs(context, contextDirs);
      }
    };
  }
  function teardownDirs(vm, dirs, destroying) {
    var i = dirs.length;
    while (i--) {
      dirs[i]._teardown();
      if (!destroying) {
        vm._directives.$remove(dirs[i]);
      }
    }
  }
  exports.compileAndLinkProps = function(vm, el, props, scope) {
    var propsLinkFn = compileProps(el, props);
    var propDirs = linkAndCapture(function() {
      propsLinkFn(vm, scope);
    }, vm);
    return makeUnlinkFn(vm, propDirs);
  };
  exports.compileRoot = function(el, options, contextOptions) {
    var containerAttrs = options._containerAttrs;
    var replacerAttrs = options._replacerAttrs;
    var contextLinkFn,
        replacerLinkFn;
    if (el.nodeType !== 11) {
      if (options._asComponent) {
        if (containerAttrs && contextOptions) {
          contextLinkFn = compileDirectives(containerAttrs, contextOptions);
        }
        if (replacerAttrs) {
          replacerLinkFn = compileDirectives(replacerAttrs, options);
        }
      } else {
        replacerLinkFn = compileDirectives(el.attributes, options);
      }
    } else if (process.env.NODE_ENV !== 'production' && containerAttrs) {
      var names = containerAttrs.filter(function(attr) {
        return attr.name.indexOf('_v-') < 0 && !onRE.test(attr.name) && attr.name !== 'slot';
      }).map(function(attr) {
        return '"' + attr.name + '"';
      });
      if (names.length) {
        var plural = names.length > 1;
        _.warn('Attribute' + (plural ? 's ' : ' ') + names.join(', ') + (plural ? ' are' : ' is') + ' ignored on component ' + '<' + options.el.tagName.toLowerCase() + '> because ' + 'the component is a fragment instance: ' + 'http://vuejs.org/guide/components.html#Fragment_Instance');
      }
    }
    return function rootLinkFn(vm, el, scope) {
      var context = vm._context;
      var contextDirs;
      if (context && contextLinkFn) {
        contextDirs = linkAndCapture(function() {
          contextLinkFn(context, el, null, scope);
        }, context);
      }
      var selfDirs = linkAndCapture(function() {
        if (replacerLinkFn)
          replacerLinkFn(vm, el);
      }, vm);
      return makeUnlinkFn(vm, selfDirs, context, contextDirs);
    };
  };
  function compileNode(node, options) {
    var type = node.nodeType;
    if (type === 1 && node.tagName !== 'SCRIPT') {
      return compileElement(node, options);
    } else if (type === 3 && node.data.trim()) {
      return compileTextNode(node, options);
    } else {
      return null;
    }
  }
  function compileElement(el, options) {
    if (el.tagName === 'TEXTAREA') {
      var tokens = textParser.parse(el.value);
      if (tokens) {
        el.setAttribute(':value', textParser.tokensToExp(tokens));
        el.value = '';
      }
    }
    var linkFn;
    var hasAttrs = el.hasAttributes();
    if (hasAttrs) {
      linkFn = checkTerminalDirectives(el, options);
    }
    if (!linkFn) {
      linkFn = checkElementDirectives(el, options);
    }
    if (!linkFn) {
      linkFn = checkComponent(el, options);
    }
    if (!linkFn && hasAttrs) {
      linkFn = compileDirectives(el.attributes, options);
    }
    return linkFn;
  }
  function compileTextNode(node, options) {
    var tokens = textParser.parse(node.data);
    if (!tokens) {
      return null;
    }
    var frag = document.createDocumentFragment();
    var el,
        token;
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      token = tokens[i];
      el = token.tag ? processTextToken(token, options) : document.createTextNode(token.value);
      frag.appendChild(el);
    }
    return makeTextNodeLinkFn(tokens, frag, options);
  }
  function processTextToken(token, options) {
    var el;
    if (token.oneTime) {
      el = document.createTextNode(token.value);
    } else {
      if (token.html) {
        el = document.createComment('v-html');
        setTokenType('html');
      } else {
        el = document.createTextNode(' ');
        setTokenType('text');
      }
    }
    function setTokenType(type) {
      if (token.descriptor)
        return;
      var parsed = dirParser.parse(token.value);
      token.descriptor = {
        name: type,
        def: publicDirectives[type],
        expression: parsed.expression,
        filters: parsed.filters
      };
    }
    return el;
  }
  function makeTextNodeLinkFn(tokens, frag) {
    return function textNodeLinkFn(vm, el, host, scope) {
      var fragClone = frag.cloneNode(true);
      var childNodes = _.toArray(fragClone.childNodes);
      var token,
          value,
          node;
      for (var i = 0,
          l = tokens.length; i < l; i++) {
        token = tokens[i];
        value = token.value;
        if (token.tag) {
          node = childNodes[i];
          if (token.oneTime) {
            value = (scope || vm).$eval(value);
            if (token.html) {
              _.replace(node, templateParser.parse(value, true));
            } else {
              node.data = value;
            }
          } else {
            vm._bindDir(token.descriptor, node, host, scope);
          }
        }
      }
      _.replace(el, fragClone);
    };
  }
  function compileNodeList(nodeList, options) {
    var linkFns = [];
    var nodeLinkFn,
        childLinkFn,
        node;
    for (var i = 0,
        l = nodeList.length; i < l; i++) {
      node = nodeList[i];
      nodeLinkFn = compileNode(node, options);
      childLinkFn = !(nodeLinkFn && nodeLinkFn.terminal) && node.tagName !== 'SCRIPT' && node.hasChildNodes() ? compileNodeList(node.childNodes, options) : null;
      linkFns.push(nodeLinkFn, childLinkFn);
    }
    return linkFns.length ? makeChildLinkFn(linkFns) : null;
  }
  function makeChildLinkFn(linkFns) {
    return function childLinkFn(vm, nodes, host, scope, frag) {
      var node,
          nodeLinkFn,
          childrenLinkFn;
      for (var i = 0,
          n = 0,
          l = linkFns.length; i < l; n++) {
        node = nodes[n];
        nodeLinkFn = linkFns[i++];
        childrenLinkFn = linkFns[i++];
        var childNodes = _.toArray(node.childNodes);
        if (nodeLinkFn) {
          nodeLinkFn(vm, node, host, scope, frag);
        }
        if (childrenLinkFn) {
          childrenLinkFn(vm, childNodes, host, scope, frag);
        }
      }
    };
  }
  function checkElementDirectives(el, options) {
    var tag = el.tagName.toLowerCase();
    if (_.commonTagRE.test(tag))
      return;
    var def = resolveAsset(options, 'elementDirectives', tag);
    if (def) {
      return makeTerminalNodeLinkFn(el, tag, '', options, def);
    }
  }
  function checkComponent(el, options) {
    var component = _.checkComponent(el, options);
    if (component) {
      var ref = _.findRef(el);
      var descriptor = {
        name: 'component',
        ref: ref,
        expression: component.id,
        def: internalDirectives.component,
        modifiers: {literal: !component.dynamic}
      };
      var componentLinkFn = function(vm, el, host, scope, frag) {
        if (ref) {
          _.defineReactive((scope || vm).$refs, ref, null);
        }
        vm._bindDir(descriptor, el, host, scope, frag);
      };
      componentLinkFn.terminal = true;
      return componentLinkFn;
    }
  }
  function checkTerminalDirectives(el, options) {
    if (_.attr(el, 'v-pre') !== null) {
      return skip;
    }
    if (el.hasAttribute('v-else')) {
      var prev = el.previousElementSibling;
      if (prev && prev.hasAttribute('v-if')) {
        return skip;
      }
    }
    var value,
        dirName;
    for (var i = 0,
        l = terminalDirectives.length; i < l; i++) {
      dirName = terminalDirectives[i];
      if (value = el.getAttribute('v-' + dirName)) {
        return makeTerminalNodeLinkFn(el, dirName, value, options);
      }
    }
  }
  function skip() {}
  skip.terminal = true;
  function makeTerminalNodeLinkFn(el, dirName, value, options, def) {
    var parsed = dirParser.parse(value);
    var descriptor = {
      name: dirName,
      expression: parsed.expression,
      filters: parsed.filters,
      raw: value,
      def: def || publicDirectives[dirName]
    };
    if (dirName === 'for' || dirName === 'router-view') {
      descriptor.ref = _.findRef(el);
    }
    var fn = function terminalNodeLinkFn(vm, el, host, scope, frag) {
      if (descriptor.ref) {
        _.defineReactive((scope || vm).$refs, descriptor.ref, null);
      }
      vm._bindDir(descriptor, el, host, scope, frag);
    };
    fn.terminal = true;
    return fn;
  }
  function compileDirectives(attrs, options) {
    var i = attrs.length;
    var dirs = [];
    var attr,
        name,
        value,
        rawName,
        rawValue,
        dirName,
        arg,
        modifiers,
        dirDef,
        tokens;
    while (i--) {
      attr = attrs[i];
      name = rawName = attr.name;
      value = rawValue = attr.value;
      tokens = textParser.parse(value);
      arg = null;
      modifiers = parseModifiers(name);
      name = name.replace(modifierRE, '');
      if (tokens) {
        value = textParser.tokensToExp(tokens);
        arg = name;
        pushDir('bind', publicDirectives.bind, true);
        if (process.env.NODE_ENV !== 'production') {
          if (name === 'class' && Array.prototype.some.call(attrs, function(attr) {
            return attr.name === ':class' || attr.name === 'v-bind:class';
          })) {
            _.warn('class="' + rawValue + '": Do not mix mustache interpolation ' + 'and v-bind for "class" on the same element. Use one or the other.');
          }
        }
      } else if (transitionRE.test(name)) {
        modifiers.literal = !bindRE.test(name);
        pushDir('transition', internalDirectives.transition);
      } else if (onRE.test(name)) {
        arg = name.replace(onRE, '');
        pushDir('on', publicDirectives.on);
      } else if (bindRE.test(name)) {
        dirName = name.replace(bindRE, '');
        if (dirName === 'style' || dirName === 'class') {
          pushDir(dirName, internalDirectives[dirName]);
        } else {
          arg = dirName;
          pushDir('bind', publicDirectives.bind);
        }
      } else if (name.indexOf('v-') === 0) {
        arg = (arg = name.match(argRE)) && arg[1];
        if (arg) {
          name = name.replace(argRE, '');
        }
        dirName = name.slice(2);
        if (dirName === 'else') {
          continue;
        }
        dirDef = resolveAsset(options, 'directives', dirName);
        if (process.env.NODE_ENV !== 'production') {
          _.assertAsset(dirDef, 'directive', dirName);
        }
        if (dirDef) {
          pushDir(dirName, dirDef);
        }
      }
    }
    function pushDir(dirName, def, interp) {
      var parsed = dirParser.parse(value);
      dirs.push({
        name: dirName,
        attr: rawName,
        raw: rawValue,
        def: def,
        arg: arg,
        modifiers: modifiers,
        expression: parsed.expression,
        filters: parsed.filters,
        interp: interp
      });
    }
    if (dirs.length) {
      return makeNodeLinkFn(dirs);
    }
  }
  function parseModifiers(name) {
    var res = Object.create(null);
    var match = name.match(modifierRE);
    if (match) {
      var i = match.length;
      while (i--) {
        res[match[i].slice(1)] = true;
      }
    }
    return res;
  }
  function makeNodeLinkFn(directives) {
    return function nodeLinkFn(vm, el, host, scope, frag) {
      var i = directives.length;
      while (i--) {
        vm._bindDir(directives[i], el, host, scope, frag);
      }
    };
  }
})(require('process'));
