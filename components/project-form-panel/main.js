import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

import {Project} from 'appl/models';

Vue.component('project-form', {
    template: tmpl,
    data(){
        return {
            project: null
        }
    },
    props: [],
    methods: {
        submit(){
            this.$root.control.project_create(this.project);
            this.project = null;
        }
    },
    events: {
        new_project(obj){
            this.project = new Project({
                name: 'New Project'
            });
        },
        edit_project(obj){
            this.project = new Project(obj);
        }
    }
});
