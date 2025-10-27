const PORT = 8000;

// Load environment variables from .env file first
async function loadEnv() {
  try {
    const envContent = await Deno.readTextFile(".env");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key && value) {
          Deno.env.set(key.trim(), value.trim());
        }
      }
    }
  } catch {
    console.log("No .env file found, using system environment variables");
  }
}

// Initialize database
async function initializeDatabase() {
  // Import database modules after env is loaded
  const { testConnection } = await import("./db/client.ts");
  const { runMigrations, seedData } = await import("./db/migrations.ts");
  const { runPendingMigrations } = await import("./db/migrationRunner.ts");
  const { runPolicyMigrations } = await import("./db/policy_migrations.ts");
  const { runChannelMigrations } = await import("./db/channel_migrations.ts");
  
  const connected = await testConnection();
  if (!connected) {
    throw new Error("Failed to connect to database");
  }
  
  // Run base migrations (create tables)
  await runMigrations();
  
  // Run additional migrations (alter tables, add columns, etc.)
  await runPendingMigrations();
  
  // Run policy migrations
  await runPolicyMigrations();
  
  // Run channel migrations
  await runChannelMigrations();
  
  // Seed initial data
  await seedData();
}

// Helper to parse JSON body
async function parseJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle requests
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Handle WebSocket upgrade requests
  if (pathname.startsWith("/ws/")) {
    const { handleWebSocketUpgrade } = await import("./websocket-server.ts");
    return await handleWebSocketUpgrade(req);
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // API Routes
  if (pathname.startsWith("/api/")) {
    try {
      // Import queries module dynamically
      const queries = await import("./db/queries.ts");
      
      // ========== SCHEMAS ==========
      if (pathname === "/api/schemas" && req.method === "GET") {
        const schemas = await queries.getAllSchemas();
        return new Response(JSON.stringify(schemas), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname === "/api/schemas" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.name || !body.field_definitions) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const schema = await queries.createSchema({
          name: body.name,
          description: body.description,
          field_definitions: body.field_definitions,
        });
        return new Response(JSON.stringify(schema), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/schemas\/[^/]+$/) && req.method === "GET") {
        const id = pathname.split("/").pop()!;
        const schema = await queries.getSchemaById(id);
        if (!schema) {
          return new Response(JSON.stringify({ error: "Schema not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(schema), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/schemas\/[^/]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop()!;
        const body = await parseJsonBody(req);
        if (!body) {
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const schema = await queries.updateSchema(id, body);
        if (!schema) {
          return new Response(JSON.stringify({ error: "Schema not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(schema), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/schemas\/[^/]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop()!;
        await queries.deleteSchema(id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== CONTENT CARDS ==========
      if (pathname === "/api/cards" && req.method === "GET") {
        const tagIdsParam = url.searchParams.get("tags");
        const tagIds = tagIdsParam ? tagIdsParam.split(",") : undefined;
        const cards = await queries.getAllCards(tagIds);
        return new Response(JSON.stringify(cards), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname === "/api/cards" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.schema_id || !body.schema_name || !body.data || !body.content) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const card = await queries.createCard({
          schema_id: body.schema_id,
          schema_name: body.schema_name,
          data: body.data,
          content: body.content,
          tag_ids: body.tag_ids,
        });
        return new Response(JSON.stringify(card), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/cards\/[^/]+$/) && req.method === "GET") {
        const id = pathname.split("/").pop()!;
        const card = await queries.getCardById(id);
        if (!card) {
          return new Response(JSON.stringify({ error: "Card not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(card), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/cards\/[^/]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop()!;
        const body = await parseJsonBody(req);
        if (!body) {
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const card = await queries.updateCard(id, body);
        if (!card) {
          return new Response(JSON.stringify({ error: "Card not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(card), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/cards\/[^/]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop()!;
        await queries.deleteCard(id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== TAGS ==========
      if (pathname === "/api/tags" && req.method === "GET") {
        const tags = await queries.getAllTags();
        return new Response(JSON.stringify(tags), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname === "/api/tags" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.name || !body.color) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const tag = await queries.createTag(body);
        return new Response(JSON.stringify(tag), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/tags\/[^/]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop()!;
        const body = await parseJsonBody(req);
        if (!body) {
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const tag = await queries.updateTag(id, body);
        if (!tag) {
          return new Response(JSON.stringify({ error: "Tag not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(tag), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/tags\/[^/]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop()!;
        await queries.deleteTag(id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== VIEWS ==========
      if (pathname === "/api/views" && req.method === "GET") {
        const views = await queries.getAllViews();
        return new Response(JSON.stringify(views), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname === "/api/views" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.name) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const view = await queries.createView(body);
        return new Response(JSON.stringify(view), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/views\/[^/]+$/) && req.method === "GET") {
        const id = pathname.split("/").pop()!;
        const view = await queries.getViewById(id);
        if (!view) {
          return new Response(JSON.stringify({ error: "View not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(view), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/views\/[^/]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop()!;
        const body = await parseJsonBody(req);
        if (!body) {
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const view = await queries.updateView(id, body);
        if (!view) {
          return new Response(JSON.stringify({ error: "View not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(view), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/views\/[^/]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop()!;
        await queries.deleteView(id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== CONNECTION POLICIES ==========
      if (pathname === "/api/policies" && req.method === "GET") {
        const policies = await queries.getAllPolicies();
        return new Response(JSON.stringify(policies), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname === "/api/policies" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.name || !body.policy_type || !body.username) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: name, policy_type, username" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Validate policy type specific requirements
        if (body.policy_type === 'output' && (!body.view_ids || body.view_ids.length === 0)) {
          return new Response(
            JSON.stringify({ error: "Output policies require at least one view_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (body.policy_type === 'input' && !body.schema_id) {
          return new Response(
            JSON.stringify({ error: "Input policies require a schema_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const policy = await queries.createPolicy(body);
        return new Response(JSON.stringify(policy), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/policies\/[^/]+$/) && req.method === "GET") {
        const id = pathname.split("/").pop()!;
        const policy = await queries.getPolicyById(id);
        if (!policy) {
          return new Response(JSON.stringify({ error: "Policy not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(policy), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/policies\/[^/]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop()!;
        const body = await parseJsonBody(req);
        if (!body) {
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const policy = await queries.updatePolicy(id, body);
        if (!policy) {
          return new Response(JSON.stringify({ error: "Policy not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(policy), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/policies\/[^/]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop()!;
        await queries.deletePolicy(id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/policies\/[^/]+\/regenerate$/) && req.method === "POST") {
        const id = pathname.split("/")[3];
        const body = await parseJsonBody(req);
        if (!body || !body.username) {
          return new Response(
            JSON.stringify({ error: "Username required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const policy = await queries.regeneratePolicyConnectionString(id, body.username);
        if (!policy) {
          return new Response(JSON.stringify({ error: "Policy not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(policy), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== CLIENT-FACING CONNECTION ENDPOINTS ==========
      if (pathname === "/api/connect/validate" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.connection_string) {
          return new Response(
            JSON.stringify({ error: "connection_string required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const policy = await queries.getPolicyByConnectionString(body.connection_string);
        if (!policy) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired connection string" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Log the validation
        await queries.logPolicyAccess({
          policy_id: policy.id,
          client_identifier: body.client_identifier,
          access_type: 'validate',
        });
        
        // Return policy info (without sensitive data)
        return new Response(JSON.stringify({
          policy_id: policy.id,
          name: policy.name,
          description: policy.description,
          policy_type: policy.policy_type,
          schema_id: policy.schema_id,
          expires_at: policy.expires_at,
          refresh_schedule: policy.refresh_schedule,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/connect\/[^/]+\/cards$/) && req.method === "GET") {
        const connectionString = pathname.split("/")[3];
        console.log("📥 KB: Received sync request for connection string:", connectionString);
        
        const policy = await queries.getPolicyByConnectionString(connectionString);
        
        if (!policy) {
          console.log("❌ KB: Invalid or expired connection string");
          return new Response(
            JSON.stringify({ error: "Invalid or expired connection string" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log("✓ KB: Found policy:", policy.name, "Type:", policy.policy_type);
        
        if (policy.policy_type !== 'output') {
          console.log("❌ KB: Policy is not an output policy");
          return new Response(
            JSON.stringify({ error: "This endpoint is only for output policies" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log("📋 KB: Fetching cards for view IDs:", policy.view_ids);
        
        // Get cards from the policy's views
        const cards = await queries.getCardsByViewIds(policy.view_ids || []);
        
        console.log(`✓ KB: Returning ${cards.length} cards to client`);
        
        // Log the access
        await queries.logPolicyAccess({
          policy_id: policy.id,
          client_identifier: url.searchParams.get('client_id') || undefined,
          access_type: 'fetch',
          cards_count: cards.length,
        });
        
        return new Response(JSON.stringify(cards), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/connect\/[^/]+\/cards$/) && req.method === "POST") {
        const connectionString = pathname.split("/")[3];
        const policy = await queries.getPolicyByConnectionString(connectionString);
        
        if (!policy) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired connection string" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (policy.policy_type !== 'input') {
          return new Response(
            JSON.stringify({ error: "This endpoint is only for input policies" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const body = await parseJsonBody(req);
        if (!body || !body.data || !body.content) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: data, content" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Get the schema
        const schema = await queries.getSchemaById(policy.schema_id!);
        if (!schema) {
          return new Response(
            JSON.stringify({ error: "Policy schema not found" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Create the card
        const card = await queries.createCard({
          schema_id: policy.schema_id!,
          schema_name: schema.name,
          data: body.data,
          content: body.content,
          tag_ids: policy.tag_ids || [],
        });
        
        // Log the access
        await queries.logPolicyAccess({
          policy_id: policy.id,
          client_identifier: body.client_identifier,
          access_type: 'send',
          cards_count: 1,
        });
        
        return new Response(JSON.stringify(card), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/connect\/[^/]+\/schema$/) && req.method === "GET") {
        const connectionString = pathname.split("/")[3];
        const policy = await queries.getPolicyByConnectionString(connectionString);
        
        if (!policy) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired connection string" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (policy.policy_type !== 'input') {
          return new Response(
            JSON.stringify({ error: "This endpoint is only for input policies" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const schema = await queries.getSchemaById(policy.schema_id!);
        if (!schema) {
          return new Response(
            JSON.stringify({ error: "Schema not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(JSON.stringify(schema), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/connect\/[^/]+\/webhook$/) && req.method === "POST") {
        const connectionString = pathname.split("/")[3];
        const policy = await queries.getPolicyByConnectionString(connectionString);
        
        if (!policy) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired connection string" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const body = await parseJsonBody(req);
        if (!body || !body.webhook_url) {
          return new Response(
            JSON.stringify({ error: "webhook_url required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const webhook = await queries.registerWebhook({
          policy_id: policy.id,
          webhook_url: body.webhook_url,
          client_identifier: body.client_identifier,
        });
        
        return new Response(JSON.stringify(webhook), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== CHANNELS ==========
      const channelQueries = await import("./db/channel_queries.ts");
      
      if (pathname === "/api/channels" && req.method === "GET") {
        const channels = await channelQueries.getAllChannels();
        return new Response(JSON.stringify(channels), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname === "/api/channels" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.name || !body.username) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: name, username" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const channel = await channelQueries.createChannel(body);
        return new Response(JSON.stringify(channel), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/channels\/[^/]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop()!;
        await channelQueries.deleteChannel(id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/channels\/[^/]+\/messages$/) && req.method === "GET") {
        const id = pathname.split("/")[3];
        const messages = await channelQueries.getChannelMessages(id);
        return new Response(JSON.stringify(messages), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // API route not found
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("API Error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Serve static files
  try {
    let filePath = pathname === "/" ? "/index.html" : pathname;
    filePath = `./public${filePath}`;

    const file = await Deno.readFile(filePath);
    const ext = filePath.split(".").pop();
    const contentType = {
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      json: "application/json",
      png: "image/png",
      jpg: "image/jpeg",
      svg: "image/svg+xml",
    }[ext || "html"] || "text/plain";

    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

// Auto-refresh scheduler
async function startPolicyRefreshScheduler() {
  const queries = await import("./db/queries.ts");
  
  console.log("⏰ Policy refresh scheduler started");
  
  // Check every 60 seconds
  setInterval(async () => {
    try {
      const policies = await queries.getAllPolicies();
      const now = new Date();
      
      for (const policy of policies) {
        if (!policy.is_active || !policy.refresh_schedule || policy.refresh_schedule === 'manual') {
          continue;
        }
        
        const lastRefresh = policy.last_refreshed_at ? new Date(policy.last_refreshed_at) : new Date(0);
        const timeSinceRefresh = now.getTime() - lastRefresh.getTime();
        
        let shouldRefresh = false;
        let intervalMs = 0;
        
        switch (policy.refresh_schedule) {
          case 'every_minute':
            intervalMs = 60 * 1000; // 1 minute
            shouldRefresh = timeSinceRefresh >= intervalMs;
            break;
          case 'hourly':
            intervalMs = 60 * 60 * 1000; // 1 hour
            shouldRefresh = timeSinceRefresh >= intervalMs;
            break;
          case 'daily':
            intervalMs = 24 * 60 * 60 * 1000; // 24 hours
            shouldRefresh = timeSinceRefresh >= intervalMs;
            break;
          case 'weekly':
            intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
            shouldRefresh = timeSinceRefresh >= intervalMs;
            break;
        }
        
        if (shouldRefresh) {
          const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
          console.log(`\n🔄 [${timestamp}] Policy Refresh Triggered`);
          console.log(`   📋 Policy: "${policy.name}"`);
          console.log(`   ⏱️  Schedule: ${policy.refresh_schedule}`);
          console.log(`   📊 Type: ${policy.policy_type}`);
          
          // Get webhooks for this policy
          const webhooks = await queries.getWebhooksByPolicyId(policy.id);
          
          if (webhooks.length > 0) {
            console.log(`   🔔 Notifying ${webhooks.length} webhook(s)...`);
            
            // Notify each webhook
            for (const webhook of webhooks) {
              try {
                const response = await fetch(webhook.webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'policy_refresh',
                    policy_id: policy.id,
                    policy_name: policy.name,
                    refresh_schedule: policy.refresh_schedule,
                    timestamp: now.toISOString(),
                  }),
                });
                
                if (response.ok) {
                  console.log(`   ✅ Webhook notified: ${webhook.webhook_url}`);
                  await queries.updateWebhookPing(webhook.id);
                } else {
                  console.log(`   ⚠️  Webhook failed (${response.status}): ${webhook.webhook_url}`);
                }
              } catch (error) {
                console.log(`   ❌ Webhook error: ${webhook.webhook_url}`, error instanceof Error ? error.message : 'Unknown error');
              }
            }
          } else {
            console.log(`   ℹ️  No webhooks registered for this policy`);
          }
          
          // Update last_refreshed_at
          await queries.updatePolicy(policy.id, {
            // Don't pass any other fields to avoid changing them
          });
          
          // Update the timestamp directly
          const { sql } = await import("./db/client.ts");
          await sql`
            UPDATE connection_policies
            SET last_refreshed_at = NOW()
            WHERE id = ${policy.id}
          `;
          
          console.log(`   ✅ Refresh complete\n`);
        }
      }
    } catch (error) {
      console.error("❌ Refresh scheduler error:", error);
    }
  }, 60000); // Check every 60 seconds
}

// Start server
async function main() {
  console.log("🚀 Initializing Knowledge Base Demo...");
  
  // Load environment variables first
  await loadEnv();
  
  // Then initialize database
  await initializeDatabase();
  
  // Start the policy refresh scheduler
  startPolicyRefreshScheduler();
  
  console.log(`\n🌐 Server running at http://localhost:${PORT}`);
  console.log("📚 Open your browser to view the Knowledge Base\n");

  Deno.serve({ port: PORT }, handleRequest);
}

main();
