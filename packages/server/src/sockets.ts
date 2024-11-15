import WebSocket from 'ws';
import { Event } from "ws";


const ws = new WebSocket(`ws://127.0.0.1:1234`)

ws.on("open", () => {
    console.log("Client connected")
})

ws.on("message", (msg) => {
    console.log("Client got message " + JSON.stringify(msg))
    console.log(`Data ${msg}`)
    ws.send("An Answer")
})

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
delay(10000)
