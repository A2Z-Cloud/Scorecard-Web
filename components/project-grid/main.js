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
        },
        add_requirement() {
            // get new requirement id - in no way actual solution hack job for demo
            var latest_imp = this.project.requirements.reduce( (a, b) => {
                return (a.id > b.id) ? a.id : b.id
            }, {id: 0})
            var latest_req = this.project.requirements.reduce( (a, b) => {
                return (a.requirement_id > b.requirement_id) ? a.requirement_id : b.requirement_id
            }, {id: 0})
            var new_req_id = latest_req + 1
            var new_imp_id = latest_imp + 1

            var new_req = {
                id: new_imp_id,
                requirement_id: new_req_id,
                requirement: '',
                sort_order: this.project.requirements.length + 1
            }
            var new_scores = this.project.providers.map( provider => { 
                return {
                    provider_id: provider.id,
                    requirement_id: new_req_id,
                    score: 0
                }
            } )

            this.project.requirements.push(new_req)
            this.project.scores.push(...new_scores)

            // wait for dom to render and focus new field
            
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