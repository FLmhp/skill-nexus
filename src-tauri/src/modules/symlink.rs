#![allow(dead_code)]
use std::fs;
use std::io;
use std::path::Path;

/// Deployment method
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DeployMethod {
    Symlink,
    Copy,
}

/// Check if symlinks are available on this platform
pub fn symlinks_available() -> bool {
    #[cfg(target_os = "windows")]
    {
        // On Windows, check if Developer Mode is enabled
        // Registry path: HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock\AllowDevelopmentWithoutDevLicense
        // For now, try creating a test symlink
        let test_target = std::env::temp_dir().join("skills-nexus-symlink-test-target");
        let test_link = std::env::temp_dir().join("skills-nexus-symlink-test");
        let _ = fs::write(&test_target, "test");
        let result = symlink_file(&test_target, &test_link);
        let _ = fs::remove_file(&test_target);
        let _ = fs::remove_file(&test_link);
        result.is_ok()
    }
    #[cfg(not(target_os = "windows"))]
    {
        true // Unix systems always support symlinks
    }
}

/// Create a symbolic link to a file
#[cfg(target_os = "windows")]
pub fn symlink_file(original: &Path, link: &Path) -> io::Result<()> {
    // Ensure parent directory exists
    if let Some(parent) = link.parent() {
        fs::create_dir_all(parent)?;
    }
    // Remove existing link if present
    if link.exists() {
        fs::remove_file(link)?;
    }
    std::os::windows::fs::symlink_file(original, link)
}

#[cfg(not(target_os = "windows"))]
pub fn symlink_file(original: &Path, link: &Path) -> io::Result<()> {
    if let Some(parent) = link.parent() {
        fs::create_dir_all(parent)?;
    }
    if link.exists() {
        fs::remove_file(link)?;
    }
    std::os::unix::fs::symlink(original, link)
}

/// Deploy a skill file using the specified method
pub fn deploy_skill(
    source_path: &Path,
    target_path: &Path,
    method: DeployMethod,
) -> io::Result<()> {
    match method {
        DeployMethod::Symlink => symlink_file(source_path, target_path),
        DeployMethod::Copy => {
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(source_path, target_path)?;
            Ok(())
        }
    }
}

/// Remove a deployed skill
pub fn remove_deployment(target_path: &Path) -> io::Result<()> {
    if target_path.exists() {
        fs::remove_file(target_path)?;
    }
    Ok(())
}
