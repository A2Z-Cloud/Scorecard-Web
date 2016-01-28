import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

export default Vue.extend({
    template: tmpl,
    props: [
        "store"
    ],
    data() {
        return {
            selected: {
                provider: "",
                requirement: "",
                scoring_method: this.total_for,
                scores: true,
                action_plan: false,
                lobby_plan: false,
                contacts: false,
                comment_type: null
            },
            scoring_methods: [
                { text: 'Total Score',   value: this.total_for   },
                { text: 'Average Score', value: this.average_for }
            ],
            save_state: {
                text: "Saved",
                error: false
            },
            no_project: false
        }
    },
    methods:{
        score_for(provider, requirement) {
            var result = this.scorecard.scores.find( score => {
                return score.requirement_id == requirement.requirement_id
                    && score.provider_id    == provider.id
            })
            return (result) ? result : {score: 0}
        },
        providers_scores_for(requirement) {
            return this.scorecard.providers.map( provider => {
                return {
                    id: provider.id,
                    score: this.score_for(provider, requirement).score
                }
            })
        },
        // class_for(provider, requirement) {
        //     // Get all scores for providers (keyed by provider id)
        //     // As well as the passed providers score
        //     var providers_scores = this.providers_scores_for(requirement)
        //     var provider_score   = this.score_for(provider, requirement).score
        //
        //     var provider_count_by_scores = providers_scores.reduce( (carry, i) => {
        //         // Add key if doesn't exist
        //         if (carry[i.score] == undefined) {
        //             carry[i.score] = 0
        //         }
        //         // Add provider id to score key
        //         carry[i.score]++
        //         return carry
        //     }, {})
        //
        //     // Figure out placement
        //     var decending_scores = Object.keys(provider_count_by_scores)  // Get all scores
        //                                  .map (  k   => parseFloat(k))    // Make them floats
        //                                  .sort((a,b) => a<b)              // Sort descending
        //     var high_score       = decending_scores[0]
        //     var winner           = (provider_score == high_score)
        //     var multiple_winners = (provider_count_by_scores[high_score] > 1)
        //
        //     // Objective placement
        //     if (winner && multiple_winners) {
        //         return 'drew'
        //     } else if (winner) {
        //         return 'won'
        //     } else {
        //         return 'lost'
        //     }
        // },
        class_for(provider, requirement) {
            let provider_score = this.score_for(provider, requirement).score
            switch (provider_score) {
                 case 1: return 'score-one'
                 case 2: return 'score-two'
                 case 3: return 'score-three'
                 case 4: return 'score-four'
                 case 5: return 'score-five'
                default: return ''
            }
        },
        total_for(provider) {
            return this.scorecard.scores.filter( score  => score.provider_id == provider.id )
                                        .map   ( score  => { return parseFloat(score.score) ? parseFloat(score.score) : 0 } )
                                        .reduce( (a, b) => a + b )
        },
        average_for(provider) {
            return this.total_for(provider) / this.scorecard.requirements.length
        },
        remove_requirement(requirement) {
            if (requirement) {
                this.$root.control.send("remove_requirement_from_project", {
                    project_id: this.scorecard.id,
                    requirement_id: requirement.id
                })
            }
        },
        remove_provider(provider) {
            if (provider) {
                this.$root.control.send("remove_provider_from_project", {
                    project_id: this.scorecard.id,
                    provider_id: provider.id
                })
            }
        },
        selected_score(event) {
            event.srcElement.select()
        },
        save_scores() {
            this.save_state.text = "Saving..."

            // Make all scores between 0 and 5
            this.scorecard.scores = this.scorecard.scores.map(score => this.constrain_score(score))

            this.$root.control.send("update_scores", {scores: this.scorecard.scores}, (request, response) => {
                this.save_state.text  = (response.error) ? "ERROR SAVING" : "Saved"
                this.save_state.error = response.error
            })
        },
        save_comment(requirement_id, type, comment) {
            this.save_state.text = "Saving..."
            var payload = {
                requirement_id: requirement_id,
                comment_type: type,
                comment: comment
            }

            this.$root.control.send("update_comment", payload, (request, response) => {
                this.save_state.text  = (response.error) ? "ERROR SAVING" : "Saved"
                this.save_state.error = response.error
            })
        },
        constrain_score(score) {
            score.score = Math.max(0, Math.min(score.score, 5))
            return score
        },
        full_requirement_name(requirement) {
            var name = requirement.name
            var unit = (requirement.unit) ? ' (' + requirement.unit + ')' : ''
            return name + unit
        }
    },
    computed: {
        remaining_providers() {
            // All providers minus those already assigned to the scorecard
            if (this.scorecard.providers && this.store.providers) {
                var selected_providers_ids = this.scorecard.providers.map(p => p.id)
                return this.store.providers.filter(p => selected_providers_ids.indexOf(p.id) == -1)
            }
        },
        remaining_requirements() {
            // All requirements minus those already assigned to the scorecard
            if (this.scorecard.requirements && this.store.requirements) {
                var selected_requirements_ids = this.scorecard.requirements.map(r => r.requirement_id)
                return this.store.requirements.filter(r => selected_requirements_ids.indexOf(r.id) == -1 && r.active == true)
            }
        },
        scorecard() {
            // Get scorecard based on url parms
            this.no_project = false

            var scorecard = null
            var proj_id   = this.$route.query.id
            var zoho_id   = this.$route.query.zoho_id

            if (this.store && this.store.projects && proj_id) scorecard = this.store.projects.find(p => p.id      == proj_id)
            if (this.store && this.store.projects && zoho_id) scorecard = this.store.projects.find(p => p.zoho_id == zoho_id)
            if (this.store && this.store.projects && !scorecard) {
                this.no_project = true
            }

            return scorecard
        },
        sorted_providers() {
            var result = this.scorecard.providers ? this.scorecard.providers.sort( (a,b) => a.name > b.name ) : []

            if (this.$root.user) {
                var users_provider = result.findIndex(p => p.id == this.$root.user.company.id)
                if (users_provider != -1) {
                    result.splice(0, 0, result.splice(users_provider, 1)[0])
                }
            }

            return result
        },
        sorted_requirements() {
            // Sort scorecard requirements by id
            return this.scorecard.requirements ? this.scorecard.requirements.sort( (a,b) => a.sort_order - b.sort_order ) : []
        }
    },
    watch: {
        'selected.provider'(provider) {
            if (provider) {
                this.$root.control.send("add_provider_to_project", {
                    project_id: this.scorecard.id,
                    provider_id: provider.id
                })
                this.selected.provider = ""
            }
        },
        'selected.requirement'(requirement) {
            if (requirement) {
                var requirements = this.scorecard.requirements
                var sort_index   = requirements ? requirements.length : 0
                this.$root.control.send("add_requirement_to_project", {
                    project_id: this.scorecard.id,
                    requirement_id: requirement.id,
                    sort_order: 0
                })
                this.selected.requirement = ""
            }
        }
    },
    events: {
        insert_provider(provider) {
            this.store.providers.push(provider)
        },
        update_provider(provider) {
            var index = this.store.providers.findIndex(p => p.id == provider.id)
            this.store.providers.$set(index, provider)
        },
        delete_provider(id) {
            var index = this.store.providers.findIndex(p => p.id == id)
            this.store.providers.splice(index, 1)
        },
        insert_requirement(requirement) {
            this.store.requirements.push(requirement)
        },
        update_requirement(requirement) {
            var index = this.store.requirements.findIndex(r => r.id == requirement.id)
            this.store.requirements.$set(index, requirement)
        },
        delete_requirement(id) {
            var index = this.store.requirements.findIndex(r => r.id == id)
            this.store.requirements.splice(index, 1)
        },
        insert_project(project) {
            this.store.projects.push(project)
        },
        update_project(project) {
            var index = this.store.projects.findIndex(p => p.id == project.id)
            this.store.projects.$set(index, project)
        },
        delete_project(id) {
            var index = this.store.projects.findIndex(p => p.id == id)
            this.store.projects.splice(index, 1)
        }
    },
    ready() {
        this.store = window.appl.get_store()
    }
});
