import sm from "source-map-support"

sm.install()

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
let answer = false

const socket = new WebSocket('ws://localhost:3005');
socket.onopen = (ev) => {
    console.log("open socket: " + ev)
}
socket.onmessage = (ev) => {
    answer = true
    console.log("on message socket: " + JSON.stringify(ev))
}
socket.onclose = (ev) => {
    console.log("close socket")
}
await delay(5000)
socket.send("Hello Test")     
await delay(5000)




