import { WebSocketServer, MessageEvent } from "ws";

const port = 1234
const path= "/one"

const wss = new WebSocketServer({port})

wss.on("connection", (ws: WebSocket) => {
    console.log("Incoming Client connected " + ws.constructor.name)
    // @ts-ignore
    ws.on("message", (msg) => {
        console.log("Server got message " + JSON.stringify(msg))
        console.log(`Data ${msg}`)
    })
    ws.send("SHello client")
    // console.log("Listeners: " + ws.)
})
wss.on("message", (ws: WebSocket) => {
    console.log("Incoming Client message " +  + ws.constructor.name)
    console.log("Listeners: " + wss.clients.forEach(client => {
        console.log("Client " + client.eventNames())
    }))
})
wss.on("listening", (ws: WebSocket) => {
    console.log("Incoming Client listening " +  + ws?.constructor?.name)
    // console.log("Listeners: " + ws.listeners(MessageEvent))
})

console.log("Listening ...")
