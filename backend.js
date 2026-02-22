import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import pg from "pg";

const { Pool } = pg;

const app = fastify({ logger: true });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

async function start() {
  try {
    await app.register(fastifyCors, {
      origin: process.env.FRONTEND_URL || "*", // Allow all origins in development
    });

    // Get all matches
    app.get("/matches", async (request, reply) => {
      try {
        const result = await pool.query(`
          SELECT 
            m.*,
            json_build_object(
              'name', m.creator_name,
              'contact', m.creator_contact
            ) as creator,
            COALESCE(
              json_agg(
                json_build_object(
                  'name', p.name,
                  'contact', p.contact,
                  'joinedAt', p.joined_at
                )
                ORDER BY p.joined_at
              ) FILTER (WHERE p.id IS NOT NULL),
              '[]'
            ) as players
          FROM matches m
          LEFT JOIN players p ON p.match_id = m.id
          GROUP BY m.id
          ORDER BY m.created_at DESC
        `);

        return result.rows;
      } catch (err) {
        console.error("Error fetching matches:", err);
        reply.code(500);
        return { error: "Failed to fetch matches" };
      }
    });

    // Get specific match by ID
    app.get("/matches/:id", async (request, reply) => {
      try {
        const matchId = parseInt(request.params.id);

        const result = await pool.query(`
          SELECT 
            m.*,
            json_build_object(
              'name', m.creator_name,
              'contact', m.creator_contact
            ) as creator,
            COALESCE(
              json_agg(
                json_build_object(
                  'name', p.name,
                  'contact', p.contact,
                  'joinedAt', p.joined_at
                )
                ORDER BY p.joined_at
              ) FILTER (WHERE p.id IS NOT NULL),
              '[]'
            ) as players
          FROM matches m
          LEFT JOIN players p ON p.match_id = m.id
          WHERE m.id = $1
          GROUP BY m.id
        `, [matchId]);

        if (result.rows.length === 0) {
          reply.code(404);
          return { error: "Match not found" };
        }

        return result.rows[0];
      } catch (err) {
        console.error("Error fetching match:", err);
        reply.code(500);
        return { error: "Failed to fetch match" };
      }
    });

    // Create new match
    app.post("/matches", async (request, reply) => {
      try {
        const { location, date, time, playersNeeded, creator } = request.body;

        if (!location || !date || !playersNeeded || !creator || !creator.name || !creator.contact) {
          reply.code(400);
          return { error: "Missing required fields" };
        }

        const result = await pool.query(`
          INSERT INTO matches (location, date, time, players_needed, creator_name, creator_contact)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [location, date, time || null, parseInt(playersNeeded), creator.name, creator.contact]);

        const newMatch = result.rows[0];

        // Format response to match frontend expectations
        return {
          id: newMatch.id,
          location: newMatch.location,
          date: newMatch.date,
          time: newMatch.time,
          playersNeeded: newMatch.players_needed,
          creator: {
            name: newMatch.creator_name,
            contact: newMatch.creator_contact
          },
          players: [],
          createdAt: newMatch.created_at
        };
      } catch (err) {
        console.error("Error creating match:", err);
        reply.code(500);
        return { error: "Failed to create match" };
      }
    });

    // Join a match
    app.post("/matches/:id/join", async (request, reply) => {
      try {
        const matchId = parseInt(request.params.id);
        const { name, contact } = request.body;

        if (!name || !contact) {
          reply.code(400);
          return { error: "Name and contact required" };
        }

        // Check if match exists and has space
        const matchResult = await pool.query(`
          SELECT m.*, COUNT(p.id) as player_count
          FROM matches m
          LEFT JOIN players p ON p.match_id = m.id
          WHERE m.id = $1
          GROUP BY m.id
        `, [matchId]);

        if (matchResult.rows.length === 0) {
          reply.code(404);
          return { error: "Match not found" };
        }

        const match = matchResult.rows[0];
        
        if (match.player_count >= match.players_needed) {
          reply.code(400);
          return { error: "Match is full!" };
        }

        // Check if player already joined
        const existingPlayer = await pool.query(`
          SELECT * FROM players WHERE match_id = $1 AND name = $2
        `, [matchId, name]);

        if (existingPlayer.rows.length > 0) {
          reply.code(400);
          return { error: "You have already joined this match" };
        }

        // Add player to match
        await pool.query(`
          INSERT INTO players (match_id, name, contact)
          VALUES ($1, $2, $3)
        `, [matchId, name, contact]);

        // Return updated match
        const updatedMatch = await pool.query(`
          SELECT 
            m.*,
            json_build_object(
              'name', m.creator_name,
              'contact', m.creator_contact
            ) as creator,
            COALESCE(
              json_agg(
                json_build_object(
                  'name', p.name,
                  'contact', p.contact,
                  'joinedAt', p.joined_at
                )
                ORDER BY p.joined_at
              ) FILTER (WHERE p.id IS NOT NULL),
              '[]'
            ) as players
          FROM matches m
          LEFT JOIN players p ON p.match_id = m.id
          WHERE m.id = $1
          GROUP BY m.id
        `, [matchId]);

        return updatedMatch.rows[0];
      } catch (err) {
        console.error("Error joining match:", err);
        reply.code(500);
        return { error: "Failed to join match" };
      }
    });

    // Leave a match
    app.post("/matches/:id/leave", async (request, reply) => {
      try {
        const matchId = parseInt(request.params.id);
        const { name } = request.body;

        if (!name) {
          reply.code(400);
          return { error: "Name required" };
        }

        const result = await pool.query(`
          DELETE FROM players
          WHERE match_id = $1 AND name = $2
          RETURNING *
        `, [matchId, name]);

        if (result.rows.length === 0) {
          reply.code(404);
          return { error: "Player not found in this match" };
        }

        return { message: "Left match successfully" };
      } catch (err) {
        console.error("Error leaving match:", err);
        reply.code(500);
        return { error: "Failed to leave match" };
      }
    });

    // Delete a match
    app.delete("/matches/:id", async (request, reply) => {
      try {
        const matchId = parseInt(request.params.id);

        // Delete players first (foreign key constraint)
        await pool.query(`DELETE FROM players WHERE match_id = $1`, [matchId]);

        // Delete match
        const result = await pool.query(`
          DELETE FROM matches WHERE id = $1 RETURNING *
        `, [matchId]);

        if (result.rows.length === 0) {
          reply.code(404);
          return { error: "Match not found" };
        }

        return { message: "Match deleted successfully" };
      } catch (err) {
        console.error("Error deleting match:", err);
        reply.code(500);
        return { error: "Failed to delete match" };
      }
    });

    const port = process.env.PORT || 3000;
    const host = process.env.HOST || "0.0.0.0";
    
    await app.listen({ port: parseInt(port), host });
    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log("📝 Endpoints:");
    console.log("   GET    /matches");
    console.log("   GET    /matches/:id");
    console.log("   POST   /matches");
    console.log("   POST   /matches/:id/join");
    console.log("   POST   /matches/:id/leave");
    console.log("   DELETE /matches/:id");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();