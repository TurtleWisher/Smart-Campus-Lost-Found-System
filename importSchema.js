const mysql = require('mysql2/promise');
const fs = require('fs');

async function importSchema() {
    const connection = await mysql.createConnection({
        host:     'acela.proxy.rlwy.net',
        user:     'root',
        password: 'KzlWlDkuCIrMMJmquicHicfEbKrZeofX',
        database: 'railway',
        port:     38791,
        multipleStatements: true
    });

    console.log('Connected to Railway MySQL!');
    const sql = fs.readFileSync('./schema.sql', 'utf8');
    await connection.query(sql);
    console.log('Schema imported successfully!');
    await connection.end();
}

importSchema().catch(console.error);
