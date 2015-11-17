import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

var ProjectGrid = Vue.extend({
  	template: tmpl,
  	props: [
  		"project"
  	],
    methods:{
        score_for(provider,requirement) {
            var result = this.project.scores.find((item)=>{
                return item.requirement_id==requirement.requirement_id &&
                    item.provider_id==provider.id;
            });
            if(!result){
                result = {score:'n/a'};
            }
            return result;
        },
        total_for(provider) {
          return this.project.scores.filter( score  => score.provider_id == provider.id )
                                    .map   ( score  => { return parseFloat(score.score) ? parseFloat(score.score) : 0 } )
                                    .reduce( (a, b) => a + b )
        }
    },
    computed: {
        sorted_providers: function() {
            return this.project.providers ? this.project.providers.sort( (a,b) => a.id - b.id ) : []
        },
        sorted_requirements: function() {
            return this.project.requirements ? this.project.requirements.sort( (a,b) => a.sort_order - b.sort_order ) : []
        }
    },
    ready() {
        this.project = window.appl.get_score_cards(this.$route.query.zoho_id)
    }
});
// Vue.component('project-grid', ProjectGrid);

export default {
    component: ProjectGrid
}