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
			project: null,
	        loading: true,
			user: null,
			error: null
		}
    },
	methods:{
		get_score_cards(project_id) {
			var project = new Vue({
				data:{
					id:null,
					zoho_id: null,
					name: null,
					requirements: null,
					scores: null,
					providers: null
				}
			});
			this.control.send("get_scorecard",{zoho_id:project_id},(request,response)=>{
				// debugger
				if(response.error){
					this.error=response.error;
					return;
				}
				for(var key in response.result) {
					project[key]=response.result[key];
				}
			});
			return project;
		}
	},
	created() {
		// var url = "ws://localhost:8081/websocket"
		var url = "wss://a2z-scorecard-server.herokuapp.com/websocket"
		this.control = new Control(this, url);
	},
    ready() {
    	var appl = window.appl = this;
        this.loading = false;
		// this.project = this.get_score_cards(4768000000041086);
    }
}, '#scorecard');
