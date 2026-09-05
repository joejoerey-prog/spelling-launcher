use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use regex::Regex;
use crate::models::FileOperationResult;

const ALLOWED_EXTENSIONS: &[&str] = &[
    "txt", "md", "markdown", "text", "pdf", "pages", "docx", "rtf",
];

/// Sanitize filename to prevent directory traversal and invalid characters
pub fn sanitize_filename(input: &str) -> String {
    let re_traversal = Regex::new(r#"\.\.[/\\]"#).unwrap();
    let no_traversal = re_traversal.replace_all(input, "");

    let re_invalid = Regex::new(r#"[<>:"/\\|?*\x00-\x1F\s]+"#).unwrap();
    let cleaned = re_invalid.replace_all(&no_traversal, "_").trim_matches('_').to_string();

    if let Some(dot_idx) = cleaned.rfind('.') {
        let stem = cleaned[..dot_idx].trim_matches('_');
        let ext = cleaned[dot_idx + 1..].trim_matches('_');
        let safe_stem = if stem.is_empty() { "untitled" } else { stem };
        let safe_ext = if ext.is_empty() { "md" } else { ext };
        format!("{}.{}", safe_stem, safe_ext)
    } else {
        let safe_stem = if cleaned.is_empty() { "untitled" } else { &cleaned };
        format!("{}.md", safe_stem)
    }
}

/// Validate file extension is supported
pub fn validate_extension(path: &Path) -> Result<(), String> {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        let ext_lower = ext.to_lowercase();
        if ALLOWED_EXTENSIONS.contains(&ext_lower.as_str()) {
            Ok(())
        } else {
            Err(format!(
                "Unsupported file extension: '.{}'. Supported: .txt, .md, .pdf, .pages, .docx, .rtf",
                ext
            ))
        }
    } else {
        Ok(())
    }
}

/// Extracts text from PDF, Apple Pages, DOCX, or RTF using macOS native engines
pub fn extract_native_document(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Plain text or Markdown: read directly
    if ext == "txt" || ext == "md" || ext == "markdown" || ext == "text" {
        return fs::read_to_string(path).map_err(|e| format!("Failed to read text file: {}", e));
    }

    // Try compiled native doc_extractor binary first
    let mut exe_candidates = vec![
        PathBuf::from("/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/src-tauri/bin/doc_extractor"),
    ];

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            exe_candidates.push(parent.join("doc_extractor"));
            exe_candidates.push(parent.join("../Resources/bin/doc_extractor"));
            exe_candidates.push(parent.join("../Resources/doc_extractor"));
        }
    }

    for candidate in &exe_candidates {
        if candidate.exists() {
            let output = Command::new(candidate)
                .arg(file_path)
                .output()
                .map_err(|e| format!("Failed to run doc_extractor: {}", e))?;

            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !text.is_empty() {
                    return Ok(text);
                }
            }
        }
    }

    // Fallback on macOS: execute swift directly with PDFKit/mdimport
    let swift_script = format!(
        r#"
import Foundation
import PDFKit

let path = "{}"
let url = URL(fileURLWithPath: path)
let ext = url.pathExtension.lowercased()

if ext == "pdf" {{
    if let doc = PDFDocument(url: url) {{
        var pages: [String] = []
        for i in 0..<doc.pageCount {{
            if let page = doc.page(at: i), let str = page.string {{
                let trimmed = str.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {{ pages.append(trimmed) }}
            }}
        }}
        print(pages.joined(separator: "\n\n"))
    }}
}} else if ext == "pages" {{
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/bin/mdimport")
    task.arguments = ["-t", "-d3", path]
    let pipe = Pipe()
    task.standardOutput = pipe
    task.standardError = pipe
    if let _ = try? task.run() {{
        task.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        if let output = String(data: data, encoding: .utf8),
           let start = output.range(of: "kMDItemTextContent = \"") {{
            let after = output[start.upperBound...]
            if let end = after.range(of: "\";\n") {{
                var raw = String(after[..<end.lowerBound])
                raw = raw.replacingOccurrences(of: "\\\"", with: "\"")
                let lines = raw.components(separatedBy: "\\n")
                let filtered = lines.filter {{ line in
                    let l = line.trimmingCharacters(in: .whitespaces).lowercased()
                    return !l.hasSuffix(".jpg") && !l.hasSuffix(".png") && !l.hasSuffix(".pdf")
                }}
                print(filtered.joined(separator: "\n\n"))
            }}
        }}
    }}
}}
"#,
        file_path.replace('"', "\\\"")
    );

    let output = Command::new("swift")
        .arg("-e")
        .arg(&swift_script)
        .output()
        .map_err(|e| format!("Swift execution error: {}", e))?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !text.is_empty() {
            return Ok(text);
        }
    }

    Err(format!("Could not extract text from document: {}", file_path))
}

/// Safely read a text, markdown, PDF, Pages, or Word document
pub fn read_document_file(file_path: &str) -> Result<FileOperationResult, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    if !path.is_file() {
        return Err(format!("Path is not a regular file: {}", file_path));
    }
    validate_extension(path)?;

    let content = extract_native_document(file_path)?;
    let word_count = content.split_whitespace().count();

    Ok(FileOperationResult {
        success: true,
        path: file_path.to_string(),
        content: Some(content),
        message: format!("Successfully loaded document ({} words)", word_count),
        word_count: Some(word_count),
    })
}

/// Extracts text from in-memory bytes by writing to a temporary file
pub fn parse_document_from_bytes(filename: &str, bytes: &[u8]) -> Result<String, String> {
    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("txt")
        .to_lowercase();

    // If plain text, decode directly
    if ext == "txt" || ext == "md" || ext == "markdown" {
        return String::from_utf8(bytes.to_vec())
            .map_err(|e| format!("Invalid UTF-8 text file: {}", e));
    }

    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("spelling_launcher_temp_{}.{}", std::process::id(), ext));

    fs::write(&temp_file, bytes)
        .map_err(|e| format!("Failed to write temporary document: {}", e))?;

    let result = extract_native_document(temp_file.to_str().unwrap());

    // Clean up temporary file
    let _ = fs::remove_file(&temp_file);

    result
}

/// Save document with atomic rename and optional .bak backup
pub fn save_document_file(
    file_path: &str,
    content: &str,
    create_backup: bool,
) -> Result<FileOperationResult, String> {
    let path = Path::new(file_path);
    validate_extension(path)?;

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Cannot create directory: {}", e))?;
        }
    }

    if path.exists() && create_backup {
        let backup_path = path.with_extension(format!(
            "{}.bak",
            path.extension().and_then(|e| e.to_str()).unwrap_or("txt")
        ));
        let _ = fs::copy(path, backup_path);
    }

    let temp_path = path.with_extension(format!(
        "{}.tmp.{}",
        path.extension().and_then(|e| e.to_str()).unwrap_or("txt"),
        std::process::id()
    ));

    fs::write(&temp_path, content).map_err(|e| format!("Failed writing temp file: {}", e))?;
    fs::rename(&temp_path, path).map_err(|e| format!("Atomic save failed: {}", e))?;

    let word_count = content.split_whitespace().count();

    Ok(FileOperationResult {
        success: true,
        path: file_path.to_string(),
        content: None,
        message: format!("Saved successfully ({} words)", word_count),
        word_count: Some(word_count),
    })
}

/// Export document to a dedicated file with sanitized filename
pub fn export_document_file(
    filename: &str,
    content: &str,
    target_dir: Option<&str>,
) -> Result<FileOperationResult, String> {
    let safe_name = sanitize_filename(filename);
    let base_dir = match target_dir {
        Some(d) => PathBuf::from(d),
        None => dirs::download_dir().unwrap_or_else(|| PathBuf::from(".")),
    };

    let target_path = base_dir.join(safe_name);
    save_document_file(target_path.to_str().unwrap(), content, false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("My Report.md"), "My_Report.md");
        assert_eq!(sanitize_filename("../../etc/passwd"), "etc_passwd.md");
        assert_eq!(sanitize_filename("valid_name.txt"), "valid_name.txt");
    }

    #[test]
    fn test_validate_extension() {
        assert!(validate_extension(Path::new("doc.md")).is_ok());
        assert!(validate_extension(Path::new("doc.markdown")).is_ok());
        assert!(validate_extension(Path::new("doc.txt")).is_ok());
        assert!(validate_extension(Path::new("doc.pdf")).is_ok());
        assert!(validate_extension(Path::new("doc.pages")).is_ok());
        assert!(validate_extension(Path::new("doc.exe")).is_err());
    }

    #[test]
    fn test_save_and_read_roundtrip() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_roundtrip_launcher.md");
        let content = "# Title\n\nThis is test text for Spelling Launcher.";

        let save_res = save_document_file(test_file.to_str().unwrap(), content, false);
        assert!(save_res.is_ok());

        let read_res = read_document_file(test_file.to_str().unwrap());
        assert!(read_res.is_ok());
        let read_content = read_res.unwrap().content.unwrap();
        assert_eq!(read_content, content);

        let _ = fs::remove_file(test_file);
    }
}
