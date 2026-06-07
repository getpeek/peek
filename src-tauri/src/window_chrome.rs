//! macOS window chrome tweaks.
//!
//! The window is opaque (`transparent: false` in `tauri.conf.json`) because a fully
//! transparent `WKWebView` composites its entire layer tree with alpha and wrecked
//! pan/zoom performance. To keep that win *and* the rounded-corner look transparency
//! used to give us, we round only the corners here: the `NSWindow` is made
//! non-opaque with a clear backdrop, and the still-opaque web-content layer is
//! clipped to a rounded rect — so just the four corner triangles fall through to the
//! desktop while the bulk of the surface stays on the fast opaque path.

use objc2::msg_send;
use objc2::runtime::{AnyClass, AnyObject, Bool};
use tauri::WebviewWindow;

// Matches the `#root` border-radius in index.html.
const CORNER_RADIUS: f64 = 8.0;

#[allow(unsafe_code)]
pub(crate) fn apply_rounded_corners(window: &WebviewWindow) {
    if let Ok(ns_window) = window.ns_window() {
        let ns_window = ns_window.cast::<AnyObject>();
        // SAFETY: `ns_window` is a live `NSWindow`; `.setup()` runs on the main thread.
        unsafe {
            let _: () = msg_send![ns_window, setOpaque: Bool::new(false)];
            if let Some(ns_color) = AnyClass::get(c"NSColor") {
                let clear: *mut AnyObject = msg_send![ns_color, clearColor];
                let _: () = msg_send![ns_window, setBackgroundColor: clear];
            }
        }
    }

    // `with_webview` runs its closure on the main thread once the platform webview
    // exists. Clipping the web-content layer is what actually reveals the corners;
    // the view itself stays opaque, so only the corner triangles are transparent.
    let _ = window.with_webview(|webview| {
        let view = webview.inner().cast::<AnyObject>();
        if view.is_null() {
            return;
        }
        // SAFETY: `view` is the live `WKWebView` (an `NSView`); main thread.
        unsafe {
            let _: () = msg_send![view, setWantsLayer: Bool::new(true)];
            let layer: *mut AnyObject = msg_send![view, layer];
            if !layer.is_null() {
                let _: () = msg_send![layer, setCornerRadius: CORNER_RADIUS];
                let _: () = msg_send![layer, setMasksToBounds: Bool::new(true)];
            }
        }
    });
}
