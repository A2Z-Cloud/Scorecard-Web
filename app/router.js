// JS Imports
import Vue from 'vue'
import VueRouter from 'vue-router'

import {debug, hash_routing} from './consts'

// -- Route Panels
import Projects from "./components/projects/projects"


Vue.use(VueRouter)
Vue.config.debug = debug

const router = new VueRouter({
    history: !hash_routing,
    hashbang: hash_routing,
})

router.map({
    '/projects': {
        name: 'Projects',
        component: Projects,
    }
})

router.alias({
    '/': '/projects',
})

// For debugging against the web console
if (debug) {
    window.app = router
}

export default router