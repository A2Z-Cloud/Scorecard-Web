import docCookies from "./utils"

export default class Connection{
    constructor(appl, url){
        this._url                = url
        this._ws                 = null
        this._next_id            = 1
        this._pending_request    = []
        this._pending_response   = {}
        this._send_timeout       = null
        this._connected          = false
        this._handshake_complete = false
        this.connect()

		// ping to keep connection alive
        setInterval( () => {
            if(this._connected) {
                this.send("ping")
            }
        }, 30000)
    }

    connect(){
        this._ws = new WebSocket(this._url)
        this._ws.onopen = () => {
            this._connected = true
        }
        this._ws.onmessage = evt => {
            const message = JSON.parse(evt.data)
            if(message.response_id){
                const request = this._pending_response[message.response_id]
                if(request){
                    delete this._pending_response[message.response_id]
                    request.callback(request,message)
                }
            } else if(message.signal === "cookie") {
                const value = docCookies.getItem(message.message.cookie_name)
                if (value) {
                    this.send("cookie",{value})
                } else {
                    this._handshake_complete = true
                }
            } else if(message.signal === "user") {
                appl.user = message.message
                if(message.cookie){
                    const expires = new Date()
                    expires.setMonth( expires.getMonth( ) + 1 )
                    docCookies.setItem(message.cookie_name, message.cookie,expires.toGMTString())
                }
                this._handshake_complete = true
            } else {
                appl.$broadcast(message.signal, message.message)
            }
        }
        this._ws.onclose = () =>{
            this._ws = null
            this._connected = false
        }
    }

    send(action,args,callback){
        this._pending_request.push({
            id: this._next_id ++,
            action,
            args,
            callback,
        })
        if(!this._send_timeout && this._connected){
            this._send_timeout = setTimeout(this._send.bind(this),0)
        }
    }

    _send() {
        this._send_timeout = null
        this._ws.send(JSON.stringify({
            requests: this._pending_request.map(item=>{
                if(item.callback){
                    this._pending_response[item.id]=item
                }
                return [item.id,item.action,item.args]
            }),
        }))
        this._pending_request = []
    }

    login(email, password, err_back){
        this.send("login",{ email, password },(request,response)=>{
            if(response.error && err_back) {
                err_back(response.error)
            }
        })
    }

    logout(err_back){
        this.send("logout",{},(request,response)=>{
            if(response.error){
                if(err_back){
                    err_back(response.error)
                }
                return
            }
            appl.user = null
            docCookies.removeItem(response.result)
        })
    }

}
