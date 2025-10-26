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
  
  const connected = await testConnection();
  if (!connected) {
    throw new Error("Failed to connect to database");
  }
  
  // Run base migrations (create tables)
  await runMigrations();
  
  // Run additional migrations (alter tables, add columns, etc.)
  await runPendingMigrations();
  
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
        try {
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
        } catch (error) {
          // Handle duplicate title error
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('idx_content_cards_title_lower')) {
            const title = body.data?.title || 'this title';
            return new Response(
              JSON.stringify({ error: `A card with the title "${title}" already exists. Please use a different title.` }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw error;
        }
      }

      if (pathname === "/api/cards/upsert" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.title || !body.schema_id || !body.schema_name || !body.data || !body.content) {
          return new Response(
            JSON.stringify({ error: "Missing required fields (title, schema_id, schema_name, data, content)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        try {
          const card = await queries.upsertCard({
            title: body.title,
            schema_id: body.schema_id,
            schema_name: body.schema_name,
            data: body.data,
            content: body.content,
            tag_ids: body.tag_ids,
          });
          return new Response(JSON.stringify(card), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upsert failed";
          return new Response(
            JSON.stringify({ error: message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (pathname.match(/^\/api\/cards\/by-title\/[^/]+$/) && req.method === "GET") {
        const title = decodeURIComponent(pathname.split("/").pop()!);
        const card = await queries.getCardByTitle(title);
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
        
        // Auto-regenerate affected showcases
        try {
          const { generateShowcaseHTML } = await import("./db/showcase-generator.ts");
          const affectedShowcases = await queries.getShowcasesByCardId(id);
          const serverUrl = `${url.protocol}//${url.host}`;
          
          for (const showcase of affectedShowcases) {
            const html = await generateShowcaseHTML(showcase.id, serverUrl);
            await queries.updateShowcase(showcase.id, { rendered_html: html });
          }
          
          if (affectedShowcases.length > 0) {
            console.log(`✅ Regenerated ${affectedShowcases.length} showcase(s) after card update`);
          }
        } catch (error) {
          console.error("⚠️  Failed to regenerate showcases:", error);
          // Don't fail the card update if showcase regeneration fails
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

      // ========== SHOWCASES ==========
      if (pathname === "/api/showcases" && req.method === "GET") {
        const showcases = await queries.getAllShowcases();
        return new Response(JSON.stringify(showcases), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname === "/api/showcases" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body || !body.name || !body.card_ids || !Array.isArray(body.card_ids)) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Create showcase
        const showcase = await queries.createShowcase({
          name: body.name,
          description: body.description,
          card_ids: body.card_ids,
          settings: body.settings,
        });
        
        // Generate HTML
        const { generateShowcaseHTML } = await import("./db/showcase-generator.ts");
        const serverUrl = `${url.protocol}//${url.host}`;
        const html = await generateShowcaseHTML(showcase.id, serverUrl);
        
        // Update with rendered HTML
        await queries.updateShowcase(showcase.id, { rendered_html: html });
        
        return new Response(JSON.stringify(showcase), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/showcases\/[^/]+\/with-cards$/) && req.method === "GET") {
        const id = pathname.split("/")[3];
        const showcase = await queries.getShowcaseWithCards(id);
        if (!showcase) {
          return new Response(JSON.stringify({ error: "Showcase not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(showcase), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/showcases\/[^/]+$/) && req.method === "GET") {
        const id = pathname.split("/").pop()!;
        const showcase = await queries.getShowcaseById(id);
        if (!showcase) {
          return new Response(JSON.stringify({ error: "Showcase not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(showcase), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/showcases\/[^/]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop()!;
        const body = await parseJsonBody(req);
        if (!body) {
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Update showcase
        await queries.updateShowcase(id, {
          name: body.name,
          description: body.description,
          card_ids: body.card_ids,
          settings: body.settings,
        });
        
        // Regenerate HTML
        const { generateShowcaseHTML } = await import("./db/showcase-generator.ts");
        const serverUrl = `${url.protocol}//${url.host}`;
        const html = await generateShowcaseHTML(id, serverUrl);
        
        // Update with rendered HTML
        const showcase = await queries.updateShowcase(id, { rendered_html: html });
        
        if (!showcase) {
          return new Response(JSON.stringify({ error: "Showcase not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify(showcase), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/showcases\/[^/]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop()!;
        await queries.deleteShowcase(id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pathname.match(/^\/api\/showcases\/[^/]+\/regenerate$/) && req.method === "POST") {
        const id = pathname.split("/")[3];
        const { generateShowcaseHTML } = await import("./db/showcase-generator.ts");
        const serverUrl = `${url.protocol}//${url.host}`;
        
        const html = await generateShowcaseHTML(id, serverUrl);
        const showcase = await queries.updateShowcase(id, { rendered_html: html });
        
        if (!showcase) {
          return new Response(JSON.stringify({ error: "Showcase not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ success: true, showcase }), {
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

  // Public showcase viewing
  if (pathname.match(/^\/public\/showcase\/[^/]+$/)) {
    try {
      const id = pathname.split("/").pop()!;
      const queries = await import("./db/queries.ts");
      const showcase = await queries.getShowcaseById(id);
      
      if (!showcase || !showcase.is_public) {
        return new Response("Showcase not found", { status: 404 });
      }
      
      if (!showcase.rendered_html) {
        return new Response("Showcase not yet generated", { status: 503 });
      }
      
      return new Response(showcase.rendered_html, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("Error serving showcase:", error);
      return new Response("Internal server error", { status: 500 });
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
