import "skeleton-css/css/normalize.css!"
import "skeleton-css/css/skeleton.css!"
import 'font-awesome/css/font-awesome.min.css!'
import './main.css!'

import Vue from 'vue'
import VueRouter from 'vue-router'

// Import utils
import 'appl/array_hipster'

// -- Consts
import {ws_url} from 'consts/local'

import "components/menu-panel/main"
import "components/login-panel/main"
import ProjectGrid from "components/project-grid/main"
import Control from "./connection"


Vue.use(VueRouter)
Vue.config.debug=true

Vue.filter('round', function(value, decimals) {
    if(!value || !decimals) {
        value = 0
    }
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
})

Vue.filter('pretty_var', function(value) {
    return value.replace("_"," ")
})

const router = new VueRouter()
router.map({
    '/project': {
        name: 'Scorecard',
        component: ProjectGrid,
        props: ['store'],
    },
})

router.start({
    data() {
        return {
            control: null,
            store: null,
            loading: true,
            user: null,
            error: null,
        }
    },
    computed: {
        // Monitors when the handshake between the server and client end (cookie for user exchange)
        handshake_complete() {
            return this.control._handshake_complete
        },
    },
    methods:{
        get_store() {
            const store = new Vue({
                data: {
                    providers: null,
                    requirements: null,
                    projects: null,
                },
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
        },
    },
    created() {
        this.control = new Control(this, ws_url)
    },
    ready() {
        this.loading = false
    },
}, 'body')
