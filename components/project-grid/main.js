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
            requirement_query: '',
            provider_query: '',
            selected: {
                requirement_index: 0,
                provider_index: 0,
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
        requirement_selection(delta) {
            let new_index = this.selected.requirement_index + delta
            if (new_index >= this.remaining_requirements.length) {
                new_index = 0
            } else if (new_index < 0) {
                new_index = this.remaining_requirements.length - 1
            }
            this.selected.requirement_index = new_index
        },
        provider_selection(delta) {
            let new_index = this.selected.provider_index + delta
            if (new_index >= this.remaining_providers.length) {
                new_index = 0
            } else if (new_index < 0) {
                new_index = this.remaining_providers.length - 1
            }
            this.selected.provider_index = new_index
        },
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
        class_for(provider, requirement) {
            let provider_score = this.score_for(provider, requirement).score
            switch (provider_score) {
                 case 1: return 'score-one'
                 case 2: return 'score-two'
                 case 3: return 'score-three'
                 case 4: return 'score-four'
                 case 5: return 'score-five'
                default: return 'score-zero'
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
        add_requirement(requirement) {
            this.$root.control.send("add_requirement_to_project", {
                project_id: this.scorecard.id,
                requirement_id: requirement.id,
                sort_order: 0
            })
        },
        add_provider(provider) {
            this.$root.control.send("add_provider_to_project", {
                project_id: this.scorecard.id,
                provider_id: provider.id
            })
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
        column_count() {
            let count = 1
            count += (this.selected.scores) ? this.scorecard.providers.length : 0
            count += (this.selected.action_plan) ? 1 : 0
            count += (this.selected.lobby_plan) ? 1 : 0
            count += (this.selected.contacts) ? 1 : 0
            return count
        },
        remaining_providers() {
            // All providers minus those already assigned to the scorecard and matches user's search
            this.selected.provider_index = 0

            if (this.scorecard.providers && this.store.providers) {
                var selected_providers_ids = this.scorecard.providers.map(p => p.id)
                return this.store.providers.filter(p => {
                    let unused = (selected_providers_ids.indexOf(p.id) == -1)
                    return (unused && p.name.toLowerCase().indexOf(this.provider_query.toLowerCase().trim()) != -1)
                })
            }
        },
        remaining_requirements() {
            // All requirements minus those already assigned to the scorecard and matching user's search
            if (this.scorecard.requirements && this.store.requirements) {
                var selected_requirements_ids = this.scorecard.requirements.map(r => r.requirement_id)
                return this.store.requirements.filter(r => {
                    let unused = (selected_requirements_ids.indexOf(r.id) == -1 && r.active == true)
                    return (unused && r.name.toLowerCase().indexOf(this.requirement_query.toLowerCase().trim()) != -1)
                })
            }
        },
        selected_requirement() {
            if (this.selected.requirement_index < this.remaining_requirements.length) {
                return this.remaining_requirements[this.selected.requirement_index]
            } else {
                return null
            }
        },
        selected_provider() {
            if (this.selected.provider_index < this.remaining_providers.length) {
                return this.remaining_providers[this.selected.provider_index]
            } else {
                return null
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
        },
        requirements_column_width() {
            // Any columns selected then 25%, else 100%
            if ([this.selected.scores, this.selected.lobby_plan, this.selected.action_plan, this.selected.contacts].some(c => c == true)) {
                return 25
            }
            return 100
        },
        score_column_width() {
            let width = 75
            if ([this.selected.lobby_plan, this.selected.action_plan, this.selected.contacts].some(c => c == true)) {
                width = 25
            }
            return width / this.sorted_providers.length
        },
        comment_column_width() {
            let width   = 75
            let visible = [this.selected.lobby_plan, this.selected.action_plan, this.selected.contacts].filter(c => c == true)
            if (this.selected.scores) {
                width = 50
            }
            return width / visible.length
        }
    },
    watch: {

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
