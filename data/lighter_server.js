const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const LighterWS_URL = "wss://mainnet.zklighter.elliot.ai/stream";
const { lighterData, checkArbitrageOpportunities } = require('./data_aggregator');

const ws = new WebSocket(LighterWS_URL);

// Load market symbols mapping
let marketSymbols = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'market_symbols.json'));
    marketSymbols = JSON.parse(rawData);
    console.log("[LIGHTER] Loaded market symbols:", marketSymbols);
} catch (error) {
    console.error("[LIGHTER] Error loading market symbols:", error);
}

// Rate limiting for arbitrage checks
let lastCheck = 0;
const CHECK_INTERVAL = 60000; // 1 minute in milliseconds

function connectWebSocket() {
ws.on('open', () => {
    console.log("[LIGHTER] Connected to Lighter WebSocket");

    const subscriptionMessage = JSON.stringify({
        type: "subscribe",
        channel: "market_stats/all"
    });

    ws.send(subscriptionMessage);
    console.log("[LIGHTER] Sent subscription message:", subscriptionMessage);
});

ws.on('message', (data) => {
    try {
        const parsedData = JSON.parse(data);
        //console.log("[LIGHTER] Received raw data:", data.toString());
        
        if (parsedData.type === "update/market_stats") {
            //console.log("[LIGHTER] Received market stats update");

            Object.keys(parsedData.market_stats).forEach(marketId => {
                const marketData = parsedData.market_stats[marketId];
                const { current_funding_rate, funding_rate, funding_timestamp, mark_price } = marketData;
                const marketSymbol = marketSymbols[marketId] || "Unknown";

                lighterData.set(marketSymbol, {
                    current_funding_rate,
                    funding_rate,
                    funding_timestamp,
                    mark_price,
                    timestamp: new Date().toISOString()
                });

                //console.log(`[LIGHTER] Processed market data - Symbol: ${marketSymbol}, Current Funding Rate: ${current_funding_rate}`);
                //console.log("[LIGHTER] Current stored data:", [...lighterData.entries()]);
                
                // Only check for arbitrage opportunities once per minute
                const now = Date.now();
                if (now - lastCheck >= CHECK_INTERVAL) {
                    console.log("[LIGHTER] Running scheduled arbitrage check");
                    checkArbitrageOpportunities();
                    lastCheck = now;
                }
            });
        }
    } catch (error) {
        console.error("[LIGHTER] Error parsing WebSocket message:", error);
        console.error("[LIGHTER] Raw message:", data.toString());
    }
});

ws.on('error', (error) => {
    console.error("[LIGHTER] WebSocket error:", error);
});

ws.on('close', () => {
    console.log("[LIGHTER] WebSocket connection closed");

    // Reconnect logic
    setTimeout(() => {
        console.log("[LIGHTER] WebSocket connection closed. Reconnecting in 5 seconds...");
        setTimeout(connectWebSocket, 5000);
    });
});
}

connectWebSocket();