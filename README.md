# Knowledge Base Demo

A dynamic knowledge management application built with Deno that allows users to create, organize, and manage information cards with custom schemas.

## Features

- **Custom Schema Builder**: Create custom entity schemas with flexible field types
- **Card Management**: Create and view information cards based on defined schemas
- **Tag System**: Organize cards with a hierarchical tag system
- **Database Backend**: PostgreSQL database with Neon serverless integration
- **Modern UI**: Clean, responsive web interface

## Tech Stack

- **Backend**: Deno with TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **Frontend**: Vanilla JavaScript, HTML, CSS

## Prerequisites

- [Deno](https://deno.land/) installed on your system
- PostgreSQL database (or Neon account)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yasemo/knowledge_base_demo.git
cd knowledge_base_demo
```

2. Create a `.env` file in the root directory with your database connection string:
```
DATABASE_URL=your_postgresql_connection_string
```

3. Run database migrations (if needed):
The application will automatically set up the required tables on first run.

## Running the Application

### Development Mode (with hot reload):
```bash
deno task dev
```

### Production Mode:
```bash
deno task start
```

The server will start on `http://localhost:8000`

## Project Structure

```
knowledge_base_demo/
├── db/
│   ├── client.ts       # Database connection
│   ├── migrations.ts   # Database schema setup
│   └── queries.ts      # Database queries
├── public/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js              # Main application logic
│       ├── card-creator.js     # Card creation interface
│       ├── card-viewer.js      # Card viewing interface
│       ├── schema-builder.js   # Schema builder interface
│       ├── tag-manager.js      # Tag management
│       └── utils.js            # Utility functions
├── server.ts           # Main server file
├── deno.json          # Deno configuration
└── entities.md        # Entity documentation
```

## License

MIT
