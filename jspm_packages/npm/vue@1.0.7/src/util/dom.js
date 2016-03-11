/* */ 
(function(process) {
  var _ = require('./index');
  var config = require('../config');
  var transition = require('../transition/index');
  exports.query = function(el) {
    if (typeof el === 'string') {
      var selector = el;
      el = document.querySelector(el);
      if (!el) {
        process.env.NODE_ENV !== 'production' && _.warn('Cannot find element: ' + selector);
      }
    }
    return el;
  };
  exports.inDoc = function(node) {
    var doc = document.documentElement;
    var parent = node && node.parentNode;
    return doc === node || doc === parent || !!(parent && parent.nodeType === 1 && (doc.contains(parent)));
  };
  exports.attr = function(node, attr) {
    var val = node.getAttribute(attr);
    if (val !== null) {
      node.removeAttribute(attr);
    }
    return val;
  };
  exports.getBindAttr = function(node, name) {
    var val = exports.attr(node, ':' + name);
    if (val === null) {
      val = exports.attr(node, 'v-bind:' + name);
    }
    return val;
  };
  exports.before = function(el, target) {
    target.parentNode.insertBefore(el, target);
  };
  exports.after = function(el, target) {
    if (target.nextSibling) {
      exports.before(el, target.nextSibling);
    } else {
      target.parentNode.appendChild(el);
    }
  };
  exports.remove = function(el) {
    el.parentNode.removeChild(el);
  };
  exports.prepend = function(el, target) {
    if (target.firstChild) {
      exports.before(el, target.firstChild);
    } else {
      target.appendChild(el);
    }
  };
  exports.replace = function(target, el) {
    var parent = target.parentNode;
    if (parent) {
      parent.replaceChild(el, target);
    }
  };
  exports.on = function(el, event, cb) {
    el.addEventListener(event, cb);
  };
  exports.off = function(el, event, cb) {
    el.removeEventListener(event, cb);
  };
  exports.addClass = function(el, cls) {
    if (el.classList) {
      el.classList.add(cls);
    } else {
      var cur = ' ' + (el.getAttribute('class') || '') + ' ';
      if (cur.indexOf(' ' + cls + ' ') < 0) {
        el.setAttribute('class', (cur + cls).trim());
      }
    }
  };
  exports.removeClass = function(el, cls) {
    if (el.classList) {
      el.classList.remove(cls);
    } else {
      var cur = ' ' + (el.getAttribute('class') || '') + ' ';
      var tar = ' ' + cls + ' ';
      while (cur.indexOf(tar) >= 0) {
        cur = cur.replace(tar, ' ');
      }
      el.setAttribute('class', cur.trim());
    }
    if (!el.className) {
      el.removeAttribute('class');
    }
  };
  exports.extractContent = function(el, asFragment) {
    var child;
    var rawContent;
    if (exports.isTemplate(el) && el.content instanceof DocumentFragment) {
      el = el.content;
    }
    if (el.hasChildNodes()) {
      exports.trimNode(el);
      rawContent = asFragment ? document.createDocumentFragment() : document.createElement('div');
      while (child = el.firstChild) {
        rawContent.appendChild(child);
      }
    }
    return rawContent;
  };
  exports.trimNode = function(node) {
    trim(node, node.firstChild);
    trim(node, node.lastChild);
  };
  function trim(parent, node) {
    if (node && node.nodeType === 3 && !node.data.trim()) {
      parent.removeChild(node);
    }
  }
  exports.isTemplate = function(el) {
    return el.tagName && el.tagName.toLowerCase() === 'template';
  };
  exports.createAnchor = function(content, persist) {
    return config.debug ? document.createComment(content) : document.createTextNode(persist ? ' ' : '');
  };
  var refRE = /^v-ref:/;
  exports.findRef = function(node) {
    if (node.hasAttributes()) {
      var attrs = node.attributes;
      for (var i = 0,
          l = attrs.length; i < l; i++) {
        var name = attrs[i].name;
        if (refRE.test(name)) {
          node.removeAttribute(name);
          return _.camelize(name.replace(refRE, ''));
        }
      }
    }
  };
  exports.mapNodeRange = function(node, end, op) {
    var next;
    while (node !== end) {
      next = node.nextSibling;
      op(node);
      node = next;
    }
    op(end);
  };
  exports.removeNodeRange = function(start, end, vm, frag, cb) {
    var done = false;
    var removed = 0;
    var nodes = [];
    exports.mapNodeRange(start, end, function(node) {
      if (node === end)
        done = true;
      nodes.push(node);
      transition.remove(node, vm, onRemoved);
    });
    function onRemoved() {
      removed++;
      if (done && removed >= nodes.length) {
        for (var i = 0; i < nodes.length; i++) {
          frag.appendChild(nodes[i]);
        }
        cb && cb();
      }
    }
  };
})(require('process'));
