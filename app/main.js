import Vue from 'vue'

import {control_url} from './consts'

import router from './router'


System.import(control_url).then(({Control}) => {
	Control.prototype.install = function(Vue) {
        Vue.prototype.control = this
    }
    Vue.use(new Control())

    router.start({
    	data: () => ({
    		status: null,
    		error: null,
    	}),
    	ready() {
    		this.control.init((signal, message) => {
    				this.$dispatch(signal, message)}
    			.then(status => {
    				this.status = status})
    			.catch(() => {
    				this.error = "Cannot connect to server."})
    		)
    	},
    }, '#app')
})