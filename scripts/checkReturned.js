const db = require('../config/db');

(async () => {
  try {
    const [[{ returned_items }]] = await db.query("SELECT COUNT(*) AS returned_items FROM found_items WHERE status = 'Returned'");
    const [[{ total_found }]] = await db.query('SELECT COUNT(*) AS total_found FROM found_items');
    const [[{ total_lost }]] = await db.query('SELECT COUNT(*) AS total_lost FROM lost_items');
    console.log('DB counts:', { returned_items, total_found, total_lost });
    process.exit(0);
  } catch (err) {
    console.error('DB query error:', err);
    process.exit(1);
  }
})();
