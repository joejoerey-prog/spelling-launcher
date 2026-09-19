use std::process::Command;

fn main() {
    let git_sha = Command::new("git")
        .env("HOME", "/Users/joerey/.gemini/antigravity/scratch")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|out| {
            if out.status.success() {
                String::from_utf8(out.stdout).ok().map(|s| s.trim().to_string())
            } else {
                None
            }
        })
        .or_else(|| {
            // Fallback: read .git/HEAD and ref file directly
            let head_content = std::fs::read_to_string(".git/HEAD")
                .or_else(|_| std::fs::read_to_string("../../.git/HEAD"))
                .ok()?;
            let trimmed = head_content.trim();
            if let Some(ref_path) = trimmed.strip_prefix("ref: ") {
                let full_ref = std::fs::read_to_string(format!(".git/{}", ref_path))
                    .or_else(|_| std::fs::read_to_string(format!("../../.git/{}", ref_path)))
                    .ok()?;
                let sha = full_ref.trim();
                if sha.len() >= 7 {
                    Some(sha[..7].to_string())
                } else {
                    None
                }
            } else if trimmed.len() >= 7 {
                Some(trimmed[..7].to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string());

    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let target = std::env::var("TARGET").unwrap_or_else(|_| "aarch64-apple-darwin".to_string());

    println!("cargo:rustc-env=GIT_SHA={}", git_sha);
    println!("cargo:rustc-env=BUILD_PROFILE={}", profile);
    println!("cargo:rustc-env=BUILD_TARGET={}", target);
    println!("cargo:rerun-if-changed=../../.git/HEAD");
    println!("cargo:rerun-if-changed=../../.git/refs");
}
