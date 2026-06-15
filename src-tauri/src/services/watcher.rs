use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

pub struct WatchHandle {
    stop_tx: mpsc::Sender<()>,
    join: Option<JoinHandle<()>>,
}

impl WatchHandle {
    pub fn stop(mut self) {
        let _ = self.stop_tx.send(());
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
    }
}

pub fn start_watcher(
    paths: Vec<String>,
    callback: impl Fn() + Send + 'static,
) -> Result<WatchHandle, String> {
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let join = std::thread::Builder::new()
        .name("skill-nexus-watcher".to_string())
        .spawn(move || {
            let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

            let mut watcher = match RecommendedWatcher::new(
                move |res: Result<Event, notify::Error>| {
                    let _ = tx.send(res);
                },
                Config::default(),
            ) {
                Ok(w) => w,
                Err(_) => return,
            };

            let mut watched = 0;
            for path_str in &paths {
                let expanded = expand_tilde(path_str);
                let path = PathBuf::from(&expanded);
                if path.exists() && watcher.watch(&path, RecursiveMode::Recursive).is_ok() {
                    watched += 1;
                }
            }

            if watched == 0 {
                return;
            }

            let debounce = Duration::from_millis(800);
            let mut last_event: Option<Instant> = None;

            loop {
                if stop_rx.try_recv().is_ok() {
                    return;
                }

                match rx.recv_timeout(Duration::from_millis(200)) {
                    Ok(Ok(event)) => match event.kind {
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
                            last_event = Some(Instant::now());
                        }
                        _ => {}
                    },
                    Ok(Err(_)) => {}
                    Err(mpsc::RecvTimeoutError::Timeout) => {}
                    Err(mpsc::RecvTimeoutError::Disconnected) => return,
                }

                if last_event
                    .map(|instant| instant.elapsed() >= debounce)
                    .unwrap_or(false)
                {
                    last_event = None;
                    callback();
                }
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(WatchHandle {
        stop_tx,
        join: Some(join),
    })
}

fn expand_tilde(path: &str) -> String {
    if !path.starts_with('~') {
        return path.to_string();
    }
    let home = if cfg!(windows) {
        std::env::var("USERPROFILE").unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };
    if home.is_empty() {
        return path.to_string();
    }
    path.replacen('~', &home, 1)
}
