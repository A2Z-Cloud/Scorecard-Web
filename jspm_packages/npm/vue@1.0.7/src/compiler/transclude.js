/* */ 
(function(process) {
  var _ = require('../util/index');
  var templateParser = require('../parsers/template');
  var specialCharRE = /[^\w\-:\.]/;
  exports.transclude = function(el, options) {
    if (options) {
      options._containerAttrs = extractAttrs(el);
    }
    if (_.isTemplate(el)) {
      el = templateParser.parse(el);
    }
    if (options) {
      if (options._asComponent && !options.template) {
        options.template = '<slot></slot>';
      }
      if (options.template) {
        options._content = _.extractContent(el);
        el = transcludeTemplate(el, options);
      }
    }
    if (el instanceof DocumentFragment) {
      _.prepend(_.createAnchor('v-start', true), el);
      el.appendChild(_.createAnchor('v-end', true));
    }
    return el;
  };
  function transcludeTemplate(el, options) {
    var template = options.template;
    var frag = templateParser.parse(template, true);
    if (frag) {
      var replacer = frag.firstChild;
      var tag = replacer.tagName && replacer.tagName.toLowerCase();
      if (options.replace) {
        if (el === document.body) {
          process.env.NODE_ENV !== 'production' && _.warn('You are mounting an instance with a template to ' + '<body>. This will replace <body> entirely. You ' + 'should probably use `replace: false` here.');
        }
        if (frag.childNodes.length > 1 || replacer.nodeType !== 1 || tag === 'component' || _.resolveAsset(options, 'components', tag) || replacer.hasAttribute('is') || replacer.hasAttribute(':is') || replacer.hasAttribute('v-bind:is') || _.resolveAsset(options, 'elementDirectives', tag) || replacer.hasAttribute('v-for') || replacer.hasAttribute('v-if')) {
          return frag;
        } else {
          options._replacerAttrs = extractAttrs(replacer);
          mergeAttrs(el, replacer);
          return replacer;
        }
      } else {
        el.appendChild(frag);
        return el;
      }
    } else {
      process.env.NODE_ENV !== 'production' && _.warn('Invalid template option: ' + template);
    }
  }
  function extractAttrs(el) {
    if (el.nodeType === 1 && el.hasAttributes()) {
      return _.toArray(el.attributes);
    }
  }
  function mergeAttrs(from, to) {
    var attrs = from.attributes;
    var i = attrs.length;
    var name,
        value;
    while (i--) {
      name = attrs[i].name;
      value = attrs[i].value;
      if (!to.hasAttribute(name) && !specialCharRE.test(name)) {
        to.setAttribute(name, value);
      } else if (name === 'class') {
        value = to.getAttribute(name) + ' ' + value;
        to.setAttribute(name, value);
      }
    }
  }
})(require('process'));
