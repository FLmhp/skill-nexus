use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;

pub fn create_pool(db_path: &Path) -> Result<Pool<SqliteConnectionManager>, r2d2::Error> {
    let manager = SqliteConnectionManager::file(db_path).with_init(|conn| {
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA busy_timeout = 5000;
             PRAGMA synchronous = NORMAL;
             PRAGMA cache_size = -64000;
             PRAGMA temp_store = MEMORY;",
        )
        .map_err(|e| {
            r2d2_sqlite::rusqlite::Error::ToSqlConversionFailure(Box::new(e))
        })?;
        Ok(())
    });

    Pool::builder()
        .max_size(8)
        .connection_timeout(std::time::Duration::from_secs(10))
        .build(manager)
}
