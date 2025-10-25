// Migration: Add more schema types and content cards
import { sql } from '../client.ts';

export async function up() {
  console.log('  Running migration: Add more schemas and content cards');
  
  // Get existing data
  const existingSchemas = await sql`SELECT name FROM schemas`;
  const existingSchemaNames = existingSchemas.map((s: any) => s.name);
  
  // Add new tags
  const newTags = [
    { name: "Design", color: "#e91e63" },
    { name: "Testing", color: "#9c27b0" },
    { name: "DevOps", color: "#3f51b5" },
    { name: "Security", color: "#f44336" },
    { name: "Performance", color: "#ff9800" },
    { name: "Personal", color: "#4caf50" },
    { name: "Learning", color: "#2196f3" },
    { name: "Cooking", color: "#ff5722" },
    { name: "UX", color: "#e91e63" },
    { name: "API", color: "#9c27b0" },
    { name: "Mobile", color: "#00bcd4" },
  ];
  
  const tagIds: Record<string, string> = {};
  for (const tag of newTags) {
    const result = await sql`
      INSERT INTO tags (name, color)
      VALUES (${tag.name}, ${tag.color})
      ON CONFLICT (name) DO UPDATE SET color = ${tag.color}
      RETURNING id
    `;
    tagIds[tag.name] = result[0].id;
  }
  
  // Get existing tag IDs
  const existingTags = await sql`SELECT id, name FROM tags`;
  for (const tag of existingTags) {
    tagIds[tag.name] = tag.id;
  }
  
  console.log('  ✅ Added new tags');
  
  // Create Book schema
  if (!existingSchemaNames.includes('Book')) {
    const bookSchema = {
      fields: [
        {
          name: "title",
          type: "text",
          label: "Book Title",
          description: "Title of the book",
          required: true,
          max_length: 200,
          display_order: 1,
        },
        {
          name: "author",
          type: "text",
          label: "Author",
          description: "Book author",
          required: true,
          max_length: 100,
          display_order: 2,
        },
        {
          name: "isbn",
          type: "text",
          label: "ISBN",
          description: "ISBN number",
          required: false,
          max_length: 20,
          display_order: 3,
        },
        {
          name: "status",
          type: "select",
          label: "Reading Status",
          description: "Current reading status",
          required: true,
          options: [
            { value: "wishlist", label: "Wishlist", color: "#9e9e9e" },
            { value: "reading", label: "Currently Reading", color: "#2196f3" },
            { value: "completed", label: "Completed", color: "#4caf50" },
          ],
          default_value: "wishlist",
          display_order: 4,
        },
        {
          name: "rating",
          type: "select",
          label: "Rating",
          description: "Your rating",
          required: false,
          options: [
            { value: "5", label: "5 stars", color: "#4caf50" },
            { value: "4", label: "4 stars", color: "#8bc34a" },
            { value: "3", label: "3 stars", color: "#ff9800" },
            { value: "2", label: "2 stars", color: "#ff5722" },
            { value: "1", label: "1 star", color: "#f44336" },
          ],
          display_order: 5,
        },
        {
          name: "genre",
          type: "text",
          label: "Genre",
          description: "Book genre",
          required: false,
          max_length: 50,
          display_order: 6,
        },
        {
          name: "pages",
          type: "number",
          label: "Pages",
          description: "Number of pages",
          required: false,
          display_order: 7,
        },
        {
          name: "content",
          type: "markdown",
          label: "Notes & Review",
          description: "Your notes and review",
          required: true,
          is_primary_content: true,
          display_order: 8,
        },
      ],
    };
    
    const bookSchemaResult = await sql`
      INSERT INTO schemas (name, description, user_id, field_definitions)
      VALUES ('Book', 'Books and reading notes', gen_random_uuid(), ${JSON.stringify(bookSchema)})
      RETURNING id
    `;
    
    console.log('  ✅ Created Book schema');
    
    // Add book cards
    const books = [
      {
        data: { title: "Clean Code", author: "Robert C. Martin", isbn: "978-0132350884", status: "completed", rating: "5", genre: "Programming", pages: 464 },
        content: `# Clean Code Review\n\nA masterpiece on writing maintainable code. Martin's principles have transformed how I approach software development.\n\n## Key Takeaways\n- Functions should do one thing well\n- Meaningful names matter\n- Comments are often code smells\n- The Boy Scout Rule: Leave code better than you found it\n\n## Favorite Chapters\n1. **Clean Functions** - Single Responsibility Principle in action\n2. **Error Handling** - Don't return null, use exceptions\n3. **Unit Tests** - TDD as a design tool\n\n**Rating: 5/5** - Essential reading for any developer.`,
        tags: ["Learning", "Backend"],
      },
      {
        data: { title: "The Design of Everyday Things", author: "Don Norman", isbn: "978-0465050659", status: "reading", genre: "Design", pages: 368 },
        content: `# Design Principles\n\nCurrently reading this classic on user-centered design. Norman's insights into affordances and signifiers are eye-opening.\n\n## Notes So Far\n- **Affordances**: What actions are possible\n- **Signifiers**: How we communicate those possibilities\n- **Mapping**: Relationship between controls and effects\n- **Feedback**: Immediate response to actions\n\n## Applications to Software\nThinking about how these principles apply to UI/UX design in web applications.`,
        tags: ["Design", "UX", "Learning"],
      },
      {
        data: { title: "Atomic Habits", author: "James Clear", isbn: "978-0735211292", status: "completed", rating: "4", genre: "Self-Help", pages: 320 },
        content: `# Building Better Habits\n\nPractical guide to habit formation. The 1% improvement philosophy resonates.\n\n## The Four Laws\n1. **Make it Obvious** - Design your environment\n2. **Make it Attractive** - Pair habits with enjoyable activities\n3. **Make it Easy** - Reduce friction\n4. **Make it Satisfying** - Immediate rewards\n\n## Personal Application\nApplying these to my daily coding practice and exercise routine.\n\n**Rating: 4/5** - Highly actionable advice.`,
        tags: ["Personal"],
      },
    ];
    
    for (const book of books) {
      const cardResult = await sql`
        INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
        VALUES (${bookSchemaResult[0].id}, 'Book', gen_random_uuid(), ${JSON.stringify(book.data)}, ${book.content})
        RETURNING id
      `;
      for (const tagName of book.tags) {
        if (tagIds[tagName]) {
          await sql`INSERT INTO card_tags (card_id, tag_id) VALUES (${cardResult[0].id}, ${tagIds[tagName]})`;
        }
      }
    }
    
    console.log('  ✅ Added Book cards');
  }
  
  // Create Project schema
  if (!existingSchemaNames.includes('Project')) {
    const projectSchema = {
      fields: [
        {
          name: "name",
          type: "text",
          label: "Project Name",
          description: "Name of the project",
          required: true,
          max_length: 150,
          display_order: 1,
        },
        {
          name: "status",
          type: "select",
          label: "Status",
          description: "Current project status",
          required: true,
          options: [
            { value: "planning", label: "Planning", color: "#9e9e9e" },
            { value: "active", label: "Active", color: "#2196f3" },
            { value: "on_hold", label: "On Hold", color: "#ff9800" },
            { value: "completed", label: "Completed", color: "#4caf50" },
          ],
          default_value: "planning",
          display_order: 2,
        },
        {
          name: "start_date",
          type: "date",
          label: "Start Date",
          description: "Project start date",
          required: false,
          display_order: 3,
        },
        {
          name: "end_date",
          type: "date",
          label: "End Date",
          description: "Project end date",
          required: false,
          display_order: 4,
        },
        {
          name: "budget",
          type: "text",
          label: "Budget",
          description: "Project budget",
          required: false,
          max_length: 50,
          display_order: 5,
        },
        {
          name: "team_size",
          type: "number",
          label: "Team Size",
          description: "Number of team members",
          required: false,
          display_order: 6,
        },
        {
          name: "progress",
          type: "select",
          label: "Progress",
          description: "Project completion percentage",
          required: false,
          options: [
            { value: "0", label: "0% - Not Started", color: "#f44336" },
            { value: "25", label: "25% - Getting Started", color: "#ff9800" },
            { value: "50", label: "50% - Half Way", color: "#ff9800" },
            { value: "75", label: "75% - Almost There", color: "#8bc34a" },
            { value: "100", label: "100% - Complete", color: "#4caf50" },
          ],
          display_order: 7,
        },
        {
          name: "content",
          type: "markdown",
          label: "Project Details",
          description: "Project description and details",
          required: true,
          is_primary_content: true,
          display_order: 8,
        },
      ],
    };
    
    const projectSchemaResult = await sql`
      INSERT INTO schemas (name, description, user_id, field_definitions)
      VALUES ('Project', 'Project portfolio and management', gen_random_uuid(), ${JSON.stringify(projectSchema)})
      RETURNING id
    `;
    
    console.log('  ✅ Created Project schema');
    
    // Add project cards
    const projects = [
      {
        data: { name: "Knowledge Base Platform", status: "active", start_date: "2024-01-15", team_size: 3, progress: "75" },
        content: `# Knowledge Base Platform\n\n## Overview\nBuilding a flexible knowledge management system with customizable schemas and powerful filtering.\n\n## Tech Stack\n- **Frontend**: Vanilla JS, HTML, CSS\n- **Backend**: Deno, PostgreSQL\n- **Hosting**: Neon serverless PostgreSQL\n\n## Features Completed\n- ✅ Schema builder\n- ✅ Content card creation\n- ✅ Tag system\n- ✅ Views with filters\n- ✅ Grid/List/Table views\n\n## In Progress\n- 🔄 Field-based filtering\n- 🔄 Advanced search\n\n## Next Steps\n- Search functionality\n- Export/import\n- Collaboration features`,
        tags: ["Backend", "Frontend", "Database"],
      },
      {
        data: { name: "E-commerce Analytics Dashboard", status: "completed", start_date: "2023-10-01", end_date: "2023-12-15", team_size: 5, progress: "100" },
        content: `# E-commerce Analytics Dashboard\n\n## Project Summary\nBuilt real-time analytics dashboard for e-commerce platform tracking sales, inventory, and customer behavior.\n\n## Achievements\n- Processed 1M+ daily events\n- Sub-second query performance\n- 99.9% uptime\n\n## Technologies\n- React + TypeScript\n- Node.js + Express\n- PostgreSQL + Redis\n- Chart.js for visualizations\n\n## Lessons Learned\n- Importance of proper indexing\n- Redis caching strategies\n- Real-time data pipelines\n\n## Metrics\n- **Performance**: 200ms avg response time\n- **Scalability**: Handles 10K concurrent users\n- **Reliability**: Zero data loss`,
        tags: ["Frontend", "Backend", "Database", "Performance"],
      },
    ];
    
    for (const project of projects) {
      const cardResult = await sql`
        INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
        VALUES (${projectSchemaResult[0].id}, 'Project', gen_random_uuid(), ${JSON.stringify(project.data)}, ${project.content})
        RETURNING id
      `;
      for (const tagName of project.tags) {
        if (tagIds[tagName]) {
          await sql`INSERT INTO card_tags (card_id, tag_id) VALUES (${cardResult[0].id}, ${tagIds[tagName]})`;
        }
      }
    }
    
    console.log('  ✅ Added Project cards');
  }
  
  // Create Meeting schema
  if (!existingSchemaNames.includes('Meeting')) {
    const meetingSchema = {
      fields: [
        {
          name: "title",
          type: "text",
          label: "Meeting Title",
          description: "Title of the meeting",
          required: true,
          max_length: 150,
          display_order: 1,
        },
        {
          name: "date",
          type: "date",
          label: "Date",
          description: "Meeting date",
          required: true,
          display_order: 2,
        },
        {
          name: "attendees",
          type: "text",
          label: "Attendees",
          description: "Who attended",
          required: false,
          max_length: 200,
          display_order: 3,
        },
        {
          name: "meeting_type",
          type: "select",
          label: "Meeting Type",
          description: "Type of meeting",
          required: true,
          options: [
            { value: "standup", label: "Daily Standup", color: "#2196f3" },
            { value: "planning", label: "Planning", color: "#9c27b0" },
            { value: "retrospective", label: "Retrospective", color: "#ff9800" },
            { value: "review", label: "Review", color: "#4caf50" },
            { value: "one_on_one", label: "1:1", color: "#e91e63" },
          ],
          display_order: 4,
        },
        {
          name: "duration",
          type: "text",
          label: "Duration",
          description: "Meeting length",
          required: false,
          max_length: 20,
          display_order: 5,
        },
        {
          name: "content",
          type: "markdown",
          label: "Meeting Notes",
          description: "Notes from the meeting",
          required: true,
          is_primary_content: true,
          display_order: 6,
        },
      ],
    };
    
    const meetingSchemaResult = await sql`
      INSERT INTO schemas (name, description, user_id, field_definitions)
      VALUES ('Meeting', 'Meeting notes and action items', gen_random_uuid(), ${JSON.stringify(meetingSchema)})
      RETURNING id
    `;
    
    console.log('  ✅ Created Meeting schema');
    
    // Add meeting cards
    const meetings = [
      {
        data: { title: "Sprint Planning - Sprint 12", date: "2024-02-20", attendees: "Sarah, Mike, Yaseen, Alex", meeting_type: "planning", duration: "2 hours" },
        content: `# Sprint 12 Planning\n\n## Sprint Goal\nComplete knowledge base filtering and search functionality\n\n## Commitments\n1. Field-based filtering for views (Yaseen) - 8 points\n2. Full-text search implementation (Mike) - 13 points\n3. UI improvements for mobile (Sarah) - 5 points\n4. Performance optimization (Alex) - 5 points\n\n## Total: 31 points\n\n## Risks\n- Search implementation complexity\n- Mobile responsive design challenges\n\n## Action Items\n- [ ] Yaseen: Create field filter UI\n- [ ] Mike: Set up Elasticsearch\n- [ ] Sarah: Mobile wireframes\n- [ ] Alex: Profile slow queries`,
        tags: ["Feature"],
      },
      {
        data: { title: "1:1 with Mike", date: "2024-02-18", attendees: "Yaseen, Mike", meeting_type: "one_on_one", duration: "30 min" },
        content: `# 1:1 Check-in\n\n## Topics Discussed\n\n### Career Development\n- Interest in backend architecture\n- Potential tech lead opportunity\n- Skill gaps to address\n\n### Current Projects\n- Knowledge base going well\n- Enjoying the database design work\n- Want more exposure to DevOps\n\n### Feedback\n- Strong technical skills\n- Good at breaking down complex problems\n- Could improve documentation\n\n## Action Items\n- [ ] Mike: Share architecture resources\n- [ ] Yaseen: Lead next design discussion\n- [ ] Schedule DevOps pairing session`,
        tags: ["Personal"],
      },
    ];
    
    for (const meeting of meetings) {
      const cardResult = await sql`
        INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
        VALUES (${meetingSchemaResult[0].id}, 'Meeting', gen_random_uuid(), ${JSON.stringify(meeting.data)}, ${meeting.content})
        RETURNING id
      `;
      for (const tagName of meeting.tags) {
        if (tagIds[tagName]) {
          await sql`INSERT INTO card_tags (card_id, tag_id) VALUES (${cardResult[0].id}, ${tagIds[tagName]})`;
        }
      }
    }
    
    console.log('  ✅ Added Meeting cards');
  }
  
  // Create Recipe schema
  if (!existingSchemaNames.includes('Recipe')) {
    const recipeSchema = {
      fields: [
        {
          name: "name",
          type: "text",
          label: "Recipe Name",
          description: "Name of the recipe",
          required: true,
          max_length: 150,
          display_order: 1,
        },
        {
          name: "cuisine",
          type: "text",
          label: "Cuisine",
          description: "Type of cuisine",
          required: false,
          max_length: 50,
          display_order: 2,
        },
        {
          name: "difficulty",
          type: "select",
          label: "Difficulty",
          description: "Cooking difficulty",
          required: true,
          options: [
            { value: "easy", label: "Easy", color: "#4caf50" },
            { value: "medium", label: "Medium", color: "#ff9800" },
            { value: "hard", label: "Hard", color: "#f44336" },
          ],
          default_value: "medium",
          display_order: 3,
        },
        {
          name: "prep_time",
          type: "text",
          label: "Prep Time",
          description: "Preparation time",
          required: false,
          max_length: 20,
          display_order: 4,
        },
        {
          name: "cook_time",
          type: "text",
          label: "Cook Time",
          description: "Cooking time",
          required: false,
          max_length: 20,
          display_order: 5,
        },
        {
          name: "servings",
          type: "number",
          label: "Servings",
          description: "Number of servings",
          required: false,
          display_order: 6,
        },
        {
          name: "content",
          type: "markdown",
          label: "Recipe Details",
          description: "Ingredients and instructions",
          required: true,
          is_primary_content: true,
          display_order: 7,
        },
      ],
    };
    
    const recipeSchemaResult = await sql`
      INSERT INTO schemas (name, description, user_id, field_definitions)
      VALUES ('Recipe', 'Cooking recipes and meal ideas', gen_random_uuid(), ${JSON.stringify(recipeSchema)})
      RETURNING id
    `;
    
    console.log('  ✅ Created Recipe schema');
    
    // Add recipe cards
    const recipes = [
      {
        data: { name: "Classic Margherita Pizza", cuisine: "Italian", difficulty: "medium", prep_time: "2 hours", cook_time: "15 min", servings: 4 },
        content: `# Margherita Pizza\n\n## Ingredients\n\n### Dough\n- 500g bread flour\n- 325ml warm water\n- 2 tsp active dry yeast\n- 2 tsp salt\n- 1 tbsp olive oil\n\n### Toppings\n- 200g San Marzano tomatoes\n- 250g fresh mozzarella\n- Fresh basil leaves\n- Extra virgin olive oil\n- Salt to taste\n\n## Instructions\n\n1. **Make the dough**: Mix yeast with warm water, let proof 5 minutes\n2. **Knead**: Combine flour, salt, yeast mixture. Knead 10 minutes\n3. **Rise**: Let rise 1.5 hours until doubled\n4. **Prepare**: Preheat oven to 500°F (260°C)\n5. **Shape**: Stretch dough into 12-inch circles\n6. **Top**: Crush tomatoes, add mozzarella, basil\n7. **Bake**: 12-15 minutes until golden\n\n## Tips\n- Use a pizza stone for best results\n- Don't overload with toppings\n- Fresh mozzarella is key`,
        tags: ["Cooking"],
      },
      {
        data: { name: "Overnight Oats", cuisine: "American", difficulty: "easy", prep_time: "5 min", cook_time: "0 min", servings: 1 },
        content: `# Overnight Oats\n\nPerfect make-ahead breakfast!\n\n## Ingredients\n- 1/2 cup rolled oats\n- 1/2 cup milk (any kind)\n- 1/4 cup Greek yogurt\n- 1 tbsp chia seeds\n- 1 tbsp honey\n- Toppings: berries, nuts, banana\n\n## Instructions\n1. Mix oats, milk, yogurt, chia, honey\n2. Refrigerate overnight\n3. Add toppings in morning\n4. Enjoy!\n\n## Variations\n- **Chocolate**: Add cocoa powder\n- **Apple Cinnamon**: Add diced apple, cinnamon\n- **Peanut Butter**: Add 1 tbsp PB\n\nMakes mornings so much easier!`,
        tags: ["Cooking"],
      },
    ];
    
    for (const recipe of recipes) {
      const cardResult = await sql`
        INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
        VALUES (${recipeSchemaResult[0].id}, 'Recipe', gen_random_uuid(), ${JSON.stringify(recipe.data)}, ${recipe.content})
        RETURNING id
      `;
      for (const tagName of recipe.tags) {
        if (tagIds[tagName]) {
          await sql`INSERT INTO card_tags (card_id, tag_id) VALUES (${cardResult[0].id}, ${tagIds[tagName]})`;
        }
      }
    }
    
    console.log('  ✅ Added Recipe cards');
  }
  
  // Create Learning Resource schema
  if (!existingSchemaNames.includes('Learning Resource')) {
    const learningSchema = {
      fields: [
        {
          name: "title",
          type: "text",
          label: "Title",
          description: "Course or resource title",
          required: true,
          max_length: 200,
          display_order: 1,
        },
        {
          name: "type",
          type: "select",
          label: "Type",
          description: "Type of resource",
          required: true,
          options: [
            { value: "course", label: "Course", color: "#2196f3" },
            { value: "tutorial", label: "Tutorial", color: "#4caf50" },
            { value: "video", label: "Video", color: "#ff9800" },
            { value: "book", label: "Book", color: "#9c27b0" },
            { value: "article", label: "Article", color: "#e91e63" },
          ],
          display_order: 2,
        },
        {
          name: "platform",
          type: "text",
          label: "Platform",
          description: "Where it's hosted",
          required: false,
          max_length: 100,
          display_order: 3,
        },
        {
          name: "duration",
          type: "text",
          label: "Duration",
          description: "How long it takes",
          required: false,
          max_length: 50,
          display_order: 4,
        },
        {
          name: "skill_level",
          type: "select",
          label: "Skill Level",
          description: "Difficulty level",
          required: false,
          options: [
            { value: "beginner", label: "Beginner", color: "#4caf50" },
            { value: "intermediate", label: "Intermediate", color: "#ff9800" },
            { value: "advanced", label: "Advanced", color: "#f44336" },
          ],
          display_order: 5,
        },
        {
          name: "completion_status",
          type: "select",
          label: "Completion Status",
          description: "Progress status",
          required: true,
          options: [
            { value: "not_started", label: "Not Started", color: "#9e9e9e" },
            { value: "in_progress", label: "In Progress", color: "#2196f3" },
            { value: "completed", label: "Completed", color: "#4caf50" },
          ],
          default_value: "not_started",
          display_order: 6,
        },
        {
          name: "content",
          type: "markdown",
          label: "Notes",
          description: "Learning notes and takeaways",
          required: true,
          is_primary_content: true,
          display_order: 7,
        },
      ],
    };
    
    const learningSchemaResult = await sql`
      INSERT INTO schemas (name, description, user_id, field_definitions)
      VALUES ('Learning Resource', 'Courses, tutorials, and learning materials', gen_random_uuid(), ${JSON.stringify(learningSchema)})
      RETURNING id
    `;
    
    console.log('  ✅ Created Learning Resource schema');
    
    // Add learning resource cards
    const resources = [
      {
        data: { title: "Full Stack Web Development", type: "course", platform: "Udemy", duration: "40 hours", skill_level: "intermediate", completion_status: "in_progress" },
        content: `# Full Stack Web Development Course\n\n## Progress: 60% Complete\n\n## What I've Learned\n\n### Frontend\n- React hooks and state management\n- Component composition patterns\n- CSS-in-JS with styled-components\n\n### Backend\n- RESTful API design\n- Database modeling with PostgreSQL\n- Authentication with JWT\n\n### DevOps\n- Docker containerization\n- CI/CD with GitHub Actions\n- Deployment to cloud platforms\n\n## Key Projects\n1. E-commerce site\n2. Real-time chat application\n3. Blog platform with CMS\n\n## Next Modules\n- GraphQL APIs\n- WebSockets\n- Microservices architecture`,
        tags: ["Learning", "Frontend", "Backend"],
      },
      {
        data: { title: "Advanced SQL Techniques", type: "tutorial", platform: "YouTube", duration: "3 hours", skill_level: "advanced", completion_status: "completed" },
        content: `# Advanced SQL Tutorial Notes\n\n## Topics Covered\n\n### Window Functions\n- ROW_NUMBER(), RANK(), DENSE_RANK()\n- Running totals and moving averages\n- Partition by clauses\n\n### CTEs and Recursive Queries\n- Common Table Expressions\n- Recursive CTEs for hierarchical data\n- Performance considerations\n\n### Query Optimization\n- EXPLAIN ANALYZE usage\n- Index strategies\n- Query plan analysis\n\n## Practical Examples\n\`\`\`sql\n-- Running total example\nSELECT \n  date,\n  amount,\n  SUM(amount) OVER (ORDER BY date) as running_total\nFROM transactions;\n\`\`\`\n\n**Status**: Completed - Ready to apply in production!`,
        tags: ["Learning", "Database"],
      },
    ];
    
    for (const resource of resources) {
      const cardResult = await sql`
        INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
        VALUES (${learningSchemaResult[0].id}, 'Learning Resource', gen_random_uuid(), ${JSON.stringify(resource.data)}, ${resource.content})
        RETURNING id
      `;
      for (const tagName of resource.tags) {
        if (tagIds[tagName]) {
          await sql`INSERT INTO card_tags (card_id, tag_id) VALUES (${cardResult[0].id}, ${tagIds[tagName]})`;
        }
      }
    }
    
    console.log('  ✅ Added Learning Resource cards');
  }
  
  console.log('  ✅ Migration completed successfully');
}

export async function down() {
  console.log('  Rolling back: Remove additional schemas and cards');
  
  // Delete schemas (will cascade to cards)
  await sql`DELETE FROM schemas WHERE name IN ('Book', 'Project', 'Meeting', 'Recipe', 'Learning Resource')`;
  
  // Delete new tags
  await sql`DELETE FROM tags WHERE name IN ('Design', 'Testing', 'DevOps', 'Security', 'Performance', 'Personal', 'Learning', 'Cooking', 'UX', 'API', 'Mobile')`;
  
  console.log('  ✅ Rollback completed');
}
