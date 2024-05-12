"use strict";

const tls = require("tls");
const WebSocket = require("ws");
const extractJsonFromString = require("extract-json-from-string");

const claimed = "token";
const list = "token";
const servar = "alınacak sw";
const info = "log atcağı kanal id";
const guilds = {};

let vanity;

const tlsSocket = tls.connect({
    host: "discord.com",
    port: 443,
});

tlsSocket.on("data", async (data) => {
    const ext = await extractJsonFromString(data.toString());
    const find = ext.find((e) => e.code || e.message);

    if (find) {
        const requestBody = JSON.stringify({
            content: `@everyone ${vanity} \n\`\`\`json\n${JSON.stringify(find)}\`\`\``,
        });

        const contentLength = Buffer.byteLength(requestBody);

        const requestHeader = [
            `POST /api/v7/channels/${info}/messages HTTP/1.1`,
            "Host: canary.discord.com",
            `Authorization: ${claimed}`,
            "Content-Type: application/json",
            `Content-Length: ${contentLength}`,
            "",
            "",
        ].join("\r\n");

        const request = requestHeader + requestBody;
        tlsSocket.write(request);
    }
});

tlsSocket.on("error", (error) => {
    console.log(`tls error`, error);
    process.exit();
});

tlsSocket.on("end", () => {
    console.log("tls connection closed");
    process.exit();
});

tlsSocket.on("secureConnect", () => {
    const websocket = new WebSocket("wss://gateway.discord.gg/");

    websocket.onclose = (event) => {
        console.log(`ws connection closed ${event.reason} ${event.code}`);
        process.exit();
    };

    websocket.onmessage = async (message) => {
        const { d, op, t } = JSON.parse(message.data);

        if (t === "GUILD_UPDATE" || t === "GUILD_DELETE") {
            const find = guilds[d.guild_id || d.id];
            if (find) {
                const requestBody = JSON.stringify({ code: find });
                const request = [
                    `PATCH /api/guilds/${servar}/vanity-url HTTP/1.1`,
                    "Host: canary.discord.com",
                    `Authorization: ${claimed}`,
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody;
                tlsSocket.write(request);
                vanity = `${find} guild ${t.toLowerCase()}`;
            }
        } else if (t === "READY") {
            d.guilds.forEach((guild) => {
                if (guild.vanity_url_code) {
                    guilds[guild.id] = guild.vanity_url_code;
                }
            });
        }

        if (op === 10) {
            websocket.send(JSON.stringify({
                op: 2,
                d: {
                    token: list,
                    intents: 1,
                    properties: {os: "windows",browser: "google",device: "Draga",},
                },
            }));
       setInterval(() => websocket.send(JSON.stringify({ op: 0, d: {}, s: null, t: "heartbeat" })), d.heartbeat_interval);



        } else if (op === 7) {
            process.exit();
        }
    };

    setInterval(() => {
        tlsSocket.write(["GET / HTTP/1.1", "Host: discord.com", "", ""].join("\r\n"));
    }, 7500);
});
