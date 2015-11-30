import "skeleton-css/css/normalize.css!";
import "skeleton-css/css/skeleton.css!";
import 'font-awesome/css/font-awesome.min.css!';
import './main.css!';

import Vue from 'vue';
import VueRouter from 'vue-router';

import "components/menu-panel/main";
import "components/login-panel/main";
import ProjectGrid from "components/project-grid/main";
import Control from "./connection";


Vue.use(VueRouter);
Vue.config.debug=true;

var Foo = Vue.extend({
    template: '<p>This is foo!</p>'
})

var router = new VueRouter()
router.map({
	'/project': ProjectGrid
})

router.start({
	data() {
		return {
			store: null,
	        loading: true,
			user: null,
			error: null
		}
    },
	methods:{
		get_store() {
			var store = new Vue({
				data: {
					providers: null,
					requirements: null,
					projects: null,
				}
			})

			this.control.send("get_providers", null, (request, response) => {
				if (response.error) {
					this.error = response.error
					return
				}
				store.providers = response.result
			})
			this.control.send("get_requirements", null, (request, response) => {
				if (response.error) {
					this.error = response.error
					return
				}
				store.requirements = response.result
			})
			this.control.send("get_projects", null, (request, response) => {
				if (response.error) {
					this.error = response.error
					return
				}
				store.projects = response.result
			})
			return store
		}
	},
	created() {
		// var url = "ws://localhost:8081/websocket"
		var url = "wss://a2z-scorecard.herokuapp.com/websocket"
		this.control = new Control(this, url);
	},
    ready() {
    	var appl = window.appl = this;
        this.loading = false;
    }
}, '#scorecard');
