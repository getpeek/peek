//! Runtime macOS Dock icon, swapped to match the active theme.
//!
//! macOS shows the bundled `.icns` until `-[NSApplication setApplicationIconImage:]`
//! is called, and that override lives only for the running process — so we re-apply
//! it on every theme change and once at startup for the persisted theme.

use objc2::msg_send;
use objc2::runtime::{AnyClass, AnyObject};
use tauri::AppHandle;

use crate::config::Theme;

#[allow(unsafe_code)]
pub(crate) fn set_for_theme(app: &AppHandle, theme: Theme) {
    let bytes: &'static [u8] = match theme {
        Theme::Pine => include_bytes!("../icons/themes/pine.png"),
        Theme::Midday => include_bytes!("../icons/themes/midday.png"),
        Theme::Midnight | Theme::Terminal => include_bytes!("../icons/themes/midnight.png"),
    };

    // AppKit must be touched on the main thread; `run_on_main_thread` queues onto the
    // event loop, so this is safe from both the IPC thread (set_theme) and setup().
    let _ = app.run_on_main_thread(move || {
        // SAFETY: standard AppKit calls on the main thread. `dataWithBytes:length:`
        // copies the buffer, so the `'static` slice outliving the call isn't required.
        unsafe {
            let (Some(data_class), Some(image_class), Some(app_class)) = (
                AnyClass::get(c"NSData"),
                AnyClass::get(c"NSImage"),
                AnyClass::get(c"NSApplication"),
            ) else {
                return;
            };

            let data: *mut AnyObject = msg_send![data_class, dataWithBytes: bytes.as_ptr().cast::<core::ffi::c_void>(), length: bytes.len()];
            let allocated: *mut AnyObject = msg_send![image_class, alloc];
            let image: *mut AnyObject = msg_send![allocated, initWithData: data];
            if image.is_null() {
                return;
            }

            let ns_app: *mut AnyObject = msg_send![app_class, sharedApplication];
            let _: () = msg_send![ns_app, setApplicationIconImage: image];
        }
    });
}
