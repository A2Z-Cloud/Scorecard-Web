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
            message: {
                text: null,
                class: '',
                timeout: null,
            },
            active: false,
            offset: 0,
            new_password: null,
            new_password_conf: null,
        };
  	},
    computed: {
        enable_change_password_button() {
            // TODO: move out into seprate functions that edit the input (red borders and hints etc)
            let input = (
                    (this.password != null || this.password != '')
                &&  (this.new_password != null || this.new_password != '')
                &&  (this.new_password_conf != null || this.new_password_conf != '')
            )

            if (input && this.new_password && this.new_password.length < 8) {
                this.present_message('Passwords need to be atleast 8 characters long', false)
                return false
            }

            if (input && this.new_password != this.new_password_conf) {
                this.present_message('New password and confirmation do not match', false)
                return false
            }

            this.hide_message()
            return input
        },
    },
    methods:{
        present_message(message, success=true, duration=10000) {
            this.message.text    = message
            this.message.class   = (success) ? 'success' : 'error'

            clearTimeout(this.message.timeout)
            this.message.timeout = setTimeout(this.hide_message, duration)
        },
        hide_message() {
            this.message.class   = ''
            this.message.text    = null
            this.message.timeout = null
        },
  		login(){
            this.hide_message()
  			this.$root.control.login(this.email, this.password,(err)=>{
                this.present_message(err, true)
                this.password = null;
            });
  		},
  		logout(){
            this.hide_message()
  			this.$root.control.logout((err) =>{
                this.present_message(err, true)
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
            this.hide_message()
  			this.$root.control.change_password(this.password, this.new_password, error => {
                this.password = this.new_password = this.new_password_conf =  null

                if (!error) {
                    this.present_message('Password Changed')
                } else {
                    this.present_message(error, false)
                }
            })
        }
    },
    ready(){
        this.offset = this.$els.footer.clientHeight
        if (this.user == null) this.toggle()
    }
});
