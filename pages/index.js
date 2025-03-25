import { useEffect, useState } from 'react';
import {io} from 'socket.io-client';

const CACHE_KEY = 'arbitrage_opportunities';
const CACHE_TIMESTAMP_KEY = 'arbitrage_opportunities_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Get WebSocket URL from environment variable or use localhost as fallback
const WS_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
console.log('[FRONTEND] WebSocket URL:', WS_URL);
console.log('[FRONTEND] Environment:', process.env.NODE_ENV);

export default function Home() {
  const [opportunities, setOpportunities] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'desc'
  });

  // Load cached data on initial render
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp);
          const now = Date.now();
          
          // Only use cache if it's less than 5 minutes old
          if (now - timestamp < CACHE_DURATION) {
            setOpportunities(JSON.parse(cachedData));
            setLastUpdate(new Date(timestamp));
            setConnectionStatus('Connected (Using cached data)');
            return true;
          }
        }
      } catch (error) {
        console.error('Error loading cached data:', error);
      }
      return false;
    };

    loadCachedData();
  }, []);

  useEffect(() => {
    console.log('[FRONTEND] Attempting to connect to WebSocket server at:', WS_URL);
    
    // Use the socket io manager directly to debug 
    const manager = io(WS_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    manager.on('reconnect_attempt', (attempt) => {
      console.log(`[FRONTEND] Reconnection attempt ${attempt}`);
      setConnectionStatus(`Reconnecting (attempt ${attempt})...`);
    });
    
    manager.on('reconnect_error', (err) => {
      console.error('[FRONTEND] Reconnect error:', err);
      setError(`Reconnection error: ${err.message}`);
    });
    
    manager.on('reconnect_failed', () => {
      console.error('[FRONTEND] Failed to reconnect');
      setConnectionStatus('Reconnection failed');
    });
    
    const newSocket = manager.socket('/', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[FRONTEND] Connected to WebSocket server, ID:', newSocket.id);
      setConnectionStatus('Connected');
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[FRONTEND] Connection error:', err);
      setConnectionStatus('Connection Error');
      setError(`Connection error: ${err.message}`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[FRONTEND] Disconnected from server, reason:', reason);
      setConnectionStatus(`Disconnected: ${reason}`);
    });

    newSocket.on('error', (err) => {
      console.error('[FRONTEND] Socket error:', err);
      setError(`Socket error: ${err.message}`);
    });

    newSocket.on('test', (data) => {
      console.log('[FRONTEND] Received test message:', data);
    });

    newSocket.on('arbitrageOpportunity', (data) => {
      console.log('[FRONTEND] Received arbitrage opportunity:', data);
      setOpportunities(prev => {
        const newOpportunities = [...prev];
        const existingIndex = newOpportunities.findIndex(opp => opp.symbol === data.symbol);
        
        if (existingIndex >= 0) {
          newOpportunities[existingIndex] = data;
        } else {
          newOpportunities.push(data);
        }
        
        // Cache the updated data
        localStorage.setItem(CACHE_KEY, JSON.stringify(newOpportunities));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        setLastUpdate(new Date());
        
        return newOpportunities;
      });
    });

    return () => newSocket.close();
  }, []);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedOpportunities = () => {
    if (!sortConfig.key) return opportunities;

    return [...opportunities].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'apyMaker':
          aValue = a.arbitrageResult.apyMarker;
          bValue = b.arbitrageResult.apyMarker;
          break;
        case 'apyTaker':
          aValue = a.arbitrageResult.apyTaker;
          bValue = b.arbitrageResult.apyTaker;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const formatLastUpdate = (date) => {
    if (!date) return '';
    return `Last updated: ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Funding Rate Arbitrage Opportunities</h1>
      
      <div className="mb-4">
        <p className="text-lg">
          Status: <span className={connectionStatus === 'Connected' ? 'text-green-500' : 'text-red-500'}>
            {connectionStatus}
          </span>
        </p>
        {lastUpdate && (
          <p className="text-gray-400 text-sm mt-1">{formatLastUpdate(lastUpdate)}</p>
        )}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>

      {opportunities.length === 0 ? (
        <p className="text-gray-400">Waiting for arbitrage opportunities...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right">Hyperliquid Funding</th>
                <th className="px-4 py-3 text-right">Lighter Funding</th>
                <th className="px-4 py-3 text-left">Position Hyperliquid</th>
                <th className="px-4 py-3 text-left">Position Lighter</th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('apyMaker')}
                >
                  APY (Maker) {getSortIcon('apyMaker')}
                </th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('apyTaker')}
                >
                  APY (Taker) {getSortIcon('apyTaker')}
                </th>
                <th className="px-4 py-3 text-right">Breakeven (Maker)</th>
                <th className="px-4 py-3 text-right">Breakeven (Taker)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {getSortedOpportunities().map((opp, index) => (
                <tr key={`${opp.symbol}-${index}`} className="hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium">{opp.symbol}</td>
                  <td className="px-4 py-3 text-right">{(opp.hyperliquidData.funding * 100).toFixed(4)}%</td>
                  <td className="px-4 py-3 text-right">{(opp.lighterData.funding_rate)}%</td>
                  <td className="px-4 py-3">{opp.arbitrageResult.positionHyperliquid}</td>
                  <td className="px-4 py-3">{opp.arbitrageResult.positionLighter}</td>
                  <td className={`px-4 py-3 text-right ${opp.arbitrageResult.apyMarker > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {opp.arbitrageResult.apyMarker.toFixed(2)}%
                  </td>
                  <td className={`px-4 py-3 text-right ${opp.arbitrageResult.apyTaker > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {opp.arbitrageResult.apyTaker.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right">{opp.arbitrageResult.breakevenTimeMaker.toFixed(2)}h</td>
                  <td className="px-4 py-3 text-right">{opp.arbitrageResult.breakevenTimeTaker.toFixed(2)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 