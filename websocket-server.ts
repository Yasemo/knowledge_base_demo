import { generateAssistantResponse } from "./openrouter-client.ts";

interface ChannelConnection {
  ws: WebSocket;
  channelId: string;
  connectionString: string;
  clientId: string;
}

// Store active WebSocket connections per channel
const channelConnections = new Map<string, Set<ChannelConnection>>();

export async function handleWebSocketUpgrade(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Check if this is a WebSocket channel request
  if (pathname.startsWith("/ws/channels/")) {
    const connectionString = pathname.split("/ws/channels/")[1];
    
    if (!connectionString) {
      return new Response("Connection string required", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    
    setupChannelWebSocket(socket, connectionString);
    
    return response;
  }

  return new Response("Not found", { status: 404 });
}

function setupChannelWebSocket(ws: WebSocket, connectionString: string) {
  let connection: ChannelConnection | null = null;

  ws.onopen = async () => {
    console.log("🔌 WebSocket connection opened for channel:", connectionString);
    
    try {
      // Validate connection string and get channel
      const channelQueries = await import("./db/channel_queries.ts");
      const channel = await channelQueries.getChannelByConnectionString(connectionString);
      
      if (!channel) {
        console.log("❌ Invalid channel connection string");
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Invalid channel connection string" 
        }));
        ws.close();
        return;
      }

      // Create connection object
      connection = {
        ws,
        channelId: channel.id,
        connectionString,
        clientId: crypto.randomUUID()
      };

      // Add to connections map
      if (!channelConnections.has(channel.id)) {
        channelConnections.set(channel.id, new Set());
      }
      channelConnections.get(channel.id)!.add(connection);

      console.log(`✅ Client connected to channel "${channel.name}" (${channelConnections.get(channel.id)!.size} total)`);

      // Send connection success
      ws.send(JSON.stringify({
        type: "connected",
        channelId: channel.id,
        channelName: channel.name,
        clientId: connection.clientId
      }));

      // Send recent message history
      const messages = await channelQueries.getChannelMessages(channel.id, 50);
      ws.send(JSON.stringify({
        type: "history",
        messages: messages
      }));

    } catch (error) {
      console.error("❌ Error setting up WebSocket:", error);
      ws.send(JSON.stringify({ 
        type: "error", 
        message: "Failed to connect to channel" 
      }));
      ws.close();
    }
  };

  ws.onmessage = async (event) => {
    if (!connection) return;

    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "message") {
        await handleChannelMessage(connection, data);
      } else if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch (error) {
      console.error("❌ Error handling message:", error);
      ws.send(JSON.stringify({ 
        type: "error", 
        message: "Failed to process message" 
      }));
    }
  };

  ws.onclose = () => {
    if (connection) {
      console.log(`🔌 Client disconnected from channel ${connection.channelId}`);
      const connections = channelConnections.get(connection.channelId);
      if (connections) {
        connections.delete(connection);
        if (connections.size === 0) {
          channelConnections.delete(connection.channelId);
        }
      }
    }
  };

  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
  };
}

async function handleChannelMessage(
  connection: ChannelConnection,
  data: { message: string; senderType: string; senderIdentifier: string; hasMention?: boolean; aiMode?: boolean }
) {
  try {
    const channelQueries = await import("./db/channel_queries.ts");
    
    // Save message to database
    const savedMessage = await channelQueries.createChannelMessage({
      channel_id: connection.channelId,
      sender_type: data.senderType as 'kb' | 'client' | 'assistant',
      sender_identifier: data.senderIdentifier,
      message: data.message,
      has_mention: data.hasMention || false
    });

    console.log(`💬 Message in channel ${connection.channelId}: [${data.senderType}] ${data.message.substring(0, 50)}...`);

    // Broadcast to all connected clients
    broadcastToChannel(connection.channelId, {
      type: "message",
      message: savedMessage
    });

    // Check for AI mode
    if (data.aiMode) {
      console.log("🤖 AI mode enabled, generating response...");
      
      // Get conversation history (all messages for full context)
      const history = await channelQueries.getConversationHistory(connection.channelId, 100);
      const channel = await channelQueries.getChannelById(connection.channelId);
      
      if (channel) {
        try {
          // Generate LLM response
          const assistantResponse = await generateAssistantResponse(
            data.message,
            history.reverse() as Array<{ sender_type: string; sender_identifier: string; message: string }>,
            channel.name
          );

          // Format response with prompt and answer
          const formattedResponse = `**Prompt:** ${data.message}\n\n**Response:** ${assistantResponse}`;

          // Save assistant message
          const assistantMessage = await channelQueries.createChannelMessage({
            channel_id: connection.channelId,
            sender_type: 'assistant',
            sender_identifier: 'AI Assistant',
            message: formattedResponse,
            has_mention: false
          });

          console.log(`🤖 Assistant responded: ${assistantResponse.substring(0, 50)}...`);

          // Broadcast assistant response
          broadcastToChannel(connection.channelId, {
            type: "message",
            message: assistantMessage
          });
        } catch (error) {
          console.error("❌ Error generating assistant response:", error);
          
          // Send error message
          const errorMessage = await channelQueries.createChannelMessage({
            channel_id: connection.channelId,
            sender_type: 'assistant',
            sender_identifier: 'AI Assistant',
            message: "I apologize, but I encountered an error generating a response. Please try again.",
            has_mention: false
          });

          broadcastToChannel(connection.channelId, {
            type: "message",
            message: errorMessage
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Error handling channel message:", error);
    connection.ws.send(JSON.stringify({
      type: "error",
      message: "Failed to save message"
    }));
  }
}

function broadcastToChannel(channelId: string, data: any) {
  const connections = channelConnections.get(channelId);
  if (!connections) return;

  const message = JSON.stringify(data);
  let sentCount = 0;

  connections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(message);
      sentCount++;
    }
  });

  console.log(`📡 Broadcast to ${sentCount} client(s) in channel ${channelId}`);
}

export function getChannelConnectionCount(channelId: string): number {
  return channelConnections.get(channelId)?.size || 0;
}
