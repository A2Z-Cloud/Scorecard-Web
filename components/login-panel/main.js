import './main.css!';
import tmpl from './main-tmpl.html!text';
import Vue from 'vue';

Vue.component('login-panel', {
  	template: tmpl,
    props:["user"],
  	data(){
        return {
      		email: null,
            password: null,
            error: null,
            active: false,
            offset: 0
        };
  	},
    methods:{
  		login(){
            this.error = null;
  			this.$root.control.login(this.email, this.password,(err)=>{
                this.error=err;
            });
  		},
  		logout(){
            this.error = null;
  			this.$root.control.logout((err) =>{
                this.error=err;
            });
  		},
        toggle(){
            if(this.active){
                this.active=false;
            }
            else{
                this.active=true;
                if(this.user===null){
                    Vue.nextTick(() => {
                      this.$els.email_input.focus();
                    });
                }
            }
            Vue.nextTick(() => {
              this.$els.toggle_btn.blur();
            });
        },
        close(){
            this.active=false;
        },
        save(){

        }
    },
    ready(){
        this.offset = this.$els.footer.clientHeight;
    }
});
