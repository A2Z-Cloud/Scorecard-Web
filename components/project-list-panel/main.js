import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

Vue.component('project-list', {
    template: tmpl,
    props: ['projects'],
    methods: {
        add_project(){
            this.$root.$broadcast('new_project');
        },
        view_project(project){
            this.$root.$broadcast('view_project', project)
        }
    }
});
