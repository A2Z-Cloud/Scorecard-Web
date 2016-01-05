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

Vue.filter('round', function(value, decimals) {
	if(!value || !decimals) {
		value = 0
	}
	return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
})

Vue.filter('pretty_var', function(value) {
	return value.replace("_"," ")
})

var router = new VueRouter()
router.map({
	'/project': {
		name: 'Scorecard',
        component: ProjectGrid,
        props: ['store']
	}
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
		var appl = window.appl = this;
		var url  = "ws://localhost:8081/websocket"
		// var url = "wss://a2z-scorecard.herokuapp.com/websocket"
		this.control = new Control(this, url);
	},
    ready() {
        this.loading = false;
    }
}, '#scorecard');
