use crate::db;
use crate::models::ScanResult;
use rusqlite::params;

pub fn get_all_scan_results(app: &tauri::AppHandle) -> Result<Vec<ScanResult>, String> {
    let conn = db::get_conn(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, skill_id, skill_name, risk_score, risk_severity, recommendation, findings_json, components_scanned, scanned_at FROM scan_results ORDER BY scanned_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map([], |row| {
            Ok(ScanResult {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                skill_name: row.get(2)?,
                risk_score: row.get(3)?,
                risk_severity: row.get(4)?,
                recommendation: row.get(5)?,
                findings_json: row.get(6)?,
                components_scanned: row.get(7)?,
                scanned_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<ScanResult>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(results)
}

pub fn get_scan_by_skill(
    app: &tauri::AppHandle,
    skill_id: &str,
) -> Result<Option<ScanResult>, String> {
    let conn = db::get_conn(app)?;
    let result = conn.query_row(
        "SELECT id, skill_id, skill_name, risk_score, risk_severity, recommendation, findings_json, components_scanned, scanned_at FROM scan_results WHERE skill_id = ?1",
        params![skill_id],
        |row| {
            Ok(ScanResult {
                id: row.get(0)?,
                skill_id: row.get(1)?,
                skill_name: row.get(2)?,
                risk_score: row.get(3)?,
                risk_severity: row.get(4)?,
                recommendation: row.get(5)?,
                findings_json: row.get(6)?,
                components_scanned: row.get(7)?,
                scanned_at: row.get(8)?,
            })
        },
    );

    match result {
        Ok(scan) => Ok(Some(scan)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn insert_scan_result(app: &tauri::AppHandle, result: &ScanResult) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "INSERT OR REPLACE INTO scan_results (id, skill_id, skill_name, risk_score, risk_severity, recommendation, findings_json, components_scanned, scanned_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            result.id,
            result.skill_id,
            result.skill_name,
            result.risk_score,
            result.risk_severity,
            result.recommendation,
            result.findings_json,
            result.components_scanned,
            result.scanned_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_scan_by_skill(app: &tauri::AppHandle, skill_id: &str) -> Result<(), String> {
    let conn = db::get_conn(app)?;
    conn.execute(
        "DELETE FROM scan_results WHERE skill_id = ?1",
        params![skill_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
