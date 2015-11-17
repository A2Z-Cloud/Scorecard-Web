import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

Vue.component('menu-panel', {
  	template: tmpl,
  	props: [
  		"projects"
  	]
});
