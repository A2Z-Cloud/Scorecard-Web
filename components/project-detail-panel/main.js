import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

Vue.component('project-detail', {
    template: tmpl,
    data(){
        return {
            project: null
        }
    },
    props: [],
    methods: {
        edit_project(){
            this.$root.$broadcast('edit_project', this.project);
        }
    },
    events: {
        view_project(project){
            this.project = project;
        }
    }
});
