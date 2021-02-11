const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");

async function main() {
    const db = await sqlite.open({
        filename: './database.db',
        driver: sqlite3.Database
    });
    await db.migrate();
}

main().catch(err => console.log(err.stack));