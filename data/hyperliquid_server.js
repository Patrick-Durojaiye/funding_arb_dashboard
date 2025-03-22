const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const HyperliquidWS_URL = "wss://api.hyperliquid.xyz/ws";
const { hyperliquidData, checkArbitrageOpportunities } = require('./data_aggregator');

let marketSymbols = [];
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'market_symbols.json'));
    const symbolMap = JSON.parse(rawData);
    marketSymbols = Object.values(symbolMap);
    console.log("[HYPERLIQUID] Loaded market symbols:", marketSymbols);
} catch (error) {
    console.error("[HYPERLIQUID] Error loading market symbols:", error);
}

// Rate limiting for arbitrage checks
let lastCheck = 0;
const CHECK_INTERVAL = 60000; // 1 minute in milliseconds

function connectWebSocket() {
const ws = new WebSocket(HyperliquidWS_URL);

ws.on('open', () => {
    console.log("[HYPERLIQUID] Connected to Hyperliquid WebSocket");

    marketSymbols.forEach((asset) => {
        const subscriptionMessage = JSON.stringify({
            method: "subscribe",
            subscription: {
                type: "activeAssetCtx",
                coin: asset
            }
        });
        ws.send(subscriptionMessage);
        console.log(`[HYPERLIQUID] Sent subscription for: ${asset}`);
    });
});

ws.on('message', (data) => {
    try {
        const parsedData = JSON.parse(data);
        console.log("[HYPERLIQUID] Received raw data:", data.toString());

        if (parsedData.channel === "subscriptionResponse" && parsedData.data?.subscription?.type === "activeAssetCtx") {
            console.log("[HYPERLIQUID] Subscription confirmed:", parsedData);
        }

        if (parsedData.data && parsedData.data.ctx) {
            const { coin, ctx } = parsedData.data;
            const { funding, openInterest, oraclePx } = ctx;

            hyperliquidData.set(coin, {
                funding,
                openInterest,
                oraclePx,
                timestamp: new Date().toISOString()
            });

            console.log(`[HYPERLIQUID] Processed data - Asset: ${coin}, Funding: ${funding}`);
            console.log("[HYPERLIQUID] Current stored data:", [...hyperliquidData.entries()]);

            // Only check for arbitrage opportunities once per minute
            const now = Date.now();
            if (now - lastCheck >= CHECK_INTERVAL) {
                console.log("[HYPERLIQUID] Running scheduled arbitrage check");
                checkArbitrageOpportunities();
                lastCheck = now;
            }
        }
    } catch (error) {
        console.error("[HYPERLIQUID] Error parsing WebSocket message:", error);
        console.error("[HYPERLIQUID] Raw message:", data.toString());
    }
});

ws.on('error', (error) => {
    console.error("[HYPERLIQUID] WebSocket error:", error);
});

ws.on('close', () => {
    console.log("[HYPERLIQUID] WebSocket connection closed");

    setTimeout(() => {
        console.log("[HYPERLIQUID] WebSocket connection closed. Reconnecting in 5 seconds......");
        setTimeout(connectWebSocket, 5000);
    });
});
}

connectWebSocket();