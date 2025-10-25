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
  
  const connected = await testConnection();
  if (!connected) {
    throw new Error("Failed to connect to database");
  }
  await runMigrations();
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

// Start server
async function main() {
  console.log("🚀 Initializing Knowledge Base Demo...");
  
  // Load environment variables first
  await loadEnv();
  
  // Then initialize database
  await initializeDatabase();
  
  console.log(`\n🌐 Server running at http://localhost:${PORT}`);
  console.log("📚 Open your browser to view the Knowledge Base\n");

  Deno.serve({ port: PORT }, handleRequest);
}

main();
