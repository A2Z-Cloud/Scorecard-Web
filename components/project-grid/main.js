import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

var ProjectGrid = Vue.extend({
    template: tmpl,
    props: [
        "store",
        "project"
    ],
    data() {
        return {
            selected: {
                provider: "",
                requirement: "",
            },
            selected_scoring_method: this.total_for,
            scoring_methods: [
                { text: 'Total Score',   value: this.total_for   },
                { text: 'Average Score', value: this.average_for }
            ]
        }
    },
    methods:{
        score_for(provider, requirement) {
            var result = this.scorecard.scores.find( item => {
                return item.requirement_id == requirement.requirement_id 
                    && item.provider_id    == provider.id
            })
            return (result) ? result : {score:'n/a'}
        },
        providers_scores_for(requirement) {
            return this.scorecard.providers.map( provider => {
                return {
                    id: provider.id,
                    score: this.score_for(provider, requirement).score
                }
            })
        },
        class_for(provider, requirement) {
            // Get all scores for providers (keyed by provider id)
            // As well as the passed providers score
            var providers_scores = this.providers_scores_for(requirement)
            var provider_score   = this.score_for(provider, requirement).score

            var provider_count_by_scores = providers_scores.reduce( (carry, i) => {
                // Add key if doesn't exist
                if (carry[i.score] == undefined) {
                    carry[i.score] = 0
                } 
                // Add provider id to score key
                carry[i.score]++
                return carry
            }, {})
            
            // Figure out placement
            var decending_scores = Object.keys(provider_count_by_scores) // Get all scores
                                         .map (k     => parseFloat(k))    // Make them floats
                                         .sort((a,b) => a<b)              // Sort descending
            var high_score       = decending_scores[0]
            var winner           = (provider_score == high_score)
            var multiple_winners = (provider_count_by_scores[high_score] > 1)

            if (winner && multiple_winners) {
                return 'drew'
            } else if (winner) {
                return 'won'
            } else {
                return 'lost'
            }
        },
        total_for(provider) {
            return this.scorecard.scores.filter( score  => score.provider_id == provider.id )
                                        .map   ( score  => { return parseFloat(score.score) ? parseFloat(score.score) : 0 } )
                                        .reduce( (a, b) => a + b )
        },
        average_for(provider) {
            return this.total_for(provider) / this.scorecard.requirements.length
        }
    },
    computed: {
        remaining_providers: function() {
            // All providers minus those already assigned to the scorecard
            if (this.scorecard && this.scorecard.providers && this.store.providers) {
                var selected_providers_ids = this.scorecard.providers.map(p => p.id)
                return this.store.providers.filter(p => selected_providers_ids.indexOf(p.id) == -1)
            }
        },
        scorecard: function() {
            // Get scorecard based on url parms
            var proj_id = this.$route.query.id
            var zoho_id = this.$route.query.zoho_id
            if (this.store.projects && proj_id) return this.store.projects.find(p => p.id      == proj_id)
            if (this.store.projects && zoho_id) return this.store.projects.find(p => p.zoho_id == zoho_id)
        },
        sorted_providers: function() {
            // Sort scorecard providers by id
            return this.scorecard.providers ? this.scorecard.providers.sort( (a,b) => a.id - b.id ) : []
        },
        sorted_requirements: function() {
            // Sort scorecard requirements by id
            return this.scorecard.requirements ? this.scorecard.requirements.sort( (a,b) => a.sort_order - b.sort_order ) : []
        }
    },
    watch: {
        'selected.provider': function(provider) {
            if (provider) {
                this.scorecard.providers.push(provider)
                // Make default scores for each requirement for new provider
                var scores = this.scorecard.requirements.map(requirement => {
                    return {
                        score: 0,
                        requirement_id: requirement.id,
                        provider_id: provider.id
                    }
                })
                this.scorecard.scores.push(...scores)
            }
        },
        'selected.requirement': function(requirement) {
            if (requirement) {
                this.scorecard.requirements.push(requirement)
                // Make default scores for each provider for new requirement
                var scores = this.scorecard.providers.map(provider => {
                    return {
                        score: 0,
                        requirement_id: requirement.id,
                        provider_id: provider.id
                    }
                })
                this.scorecard.scores.push(...scores)
            }
        }
    },
    events: {
        'insert_provider': function(provider) {
            this.store.providers.push(provider)
        },
        'update_provider': function(provider) {
            var index = this.store.providers.findIndex(p => p.id == provider.id)
            this.store.providers.$set(index, provider)
        },
        'delete_provider': function(id) {
            var index = this.store.providers.findIndex(p => p.id == id)
            this.store.providers.splice(index, 1)
        },
        'insert_requirement': function(requirement) {
            this.store.requirements.push(requirement)
        },
        'update_requirement': function(requirement) {
            var index = this.store.requirements.findIndex(r => r.id == requirement.id)
            this.store.requirements.$set(index, provider)
        },
        'delete_requirement': function(id) {
            var index = this.store.requirements.findIndex(r => r.id == id)
            this.store.requirements.splice(index, 1)
        },
        'insert_project': function(project) {
            this.store.projects.push(project)
        },
        'update_project': function(project) {
            var index = this.store.projects.findIndex(p => p.id == project.id)
            this.store.projects.$set(index, project)
        },
        'delete_project': function(id) {
            var index = this.store.projects.findIndex(p => p.id == id)
            this.store.projects.splice(index, 1)
        }
    },
    ready() {
        this.store   = window.appl.get_store()
    }
});

export default {
    component: ProjectGrid
}