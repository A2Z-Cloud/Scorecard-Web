/* */ 
var _ = require('../util/index');
var compiler = require('../compiler/index');
var templateParser = require('../parsers/template');
var Fragment = require('./fragment');
var Cache = require('../cache');
var linkerCache = new Cache(5000);
function FragmentFactory(vm, el) {
  this.vm = vm;
  var template;
  var isString = typeof el === 'string';
  if (isString || _.isTemplate(el)) {
    template = templateParser.parse(el, true);
  } else {
    template = document.createDocumentFragment();
    template.appendChild(el);
  }
  this.template = template;
  var linker;
  var cid = vm.constructor.cid;
  if (cid > 0) {
    var cacheId = cid + (isString ? el : el.outerHTML);
    linker = linkerCache.get(cacheId);
    if (!linker) {
      linker = compiler.compile(template, vm.$options, true);
      linkerCache.put(cacheId, linker);
    }
  } else {
    linker = compiler.compile(template, vm.$options, true);
  }
  this.linker = linker;
}
FragmentFactory.prototype.create = function(host, scope, parentFrag) {
  var frag = templateParser.clone(this.template);
  return new Fragment(this.linker, this.vm, frag, host, scope, parentFrag);
};
module.exports = FragmentFactory;
